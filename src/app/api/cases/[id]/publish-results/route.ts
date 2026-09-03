import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/eventLog";
import { notifyResultsPublished } from "@/lib/notifications";
import { NextResponse } from "next/server";
import { CaseStatus } from "@prisma/client";

/** POST /api/cases/[id]/publish-results - ręczna publikacja wyników po zamknięciu. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const kase = await prisma.case.findUnique({ where: { id }, select: { status: true } });
  if (!kase) return new NextResponse("Not found", { status: 404 });
  if (kase.status !== CaseStatus.CLOSED) return new NextResponse("Sprawa musi być zamknięta", { status: 400 });

  await prisma.case.update({ where: { id }, data: { status: CaseStatus.RESULTS_PUBLISHED, resultsPublishedAt: new Date() } });
  await logEvent({ action: "RESULTS_PUBLISHED", description: "Wyniki opublikowane ręcznie przez operatora", caseId: id, userId: session.user.id });
  await notifyResultsPublished(id);
  return NextResponse.json({ ok: true });
}
