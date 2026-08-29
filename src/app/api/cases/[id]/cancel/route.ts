import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/eventLog";
import { NextResponse } from "next/server";
import { CaseStatus } from "@prisma/client";

/** POST /api/cases/[id]/cancel - anulowanie sprawy przed lub w trakcie otwarcia. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const kase = await prisma.case.findUnique({ where: { id }, select: { status: true, title: true } });
  if (!kase) return new NextResponse("Not found", { status: 404 });
  if (kase.status === CaseStatus.CLOSED || kase.status === CaseStatus.RESULTS_PUBLISHED) {
    return new NextResponse("Nie można anulować zamkniętej sprawy", { status: 400 });
  }

  await prisma.case.update({ where: { id }, data: { status: CaseStatus.CANCELLED } });
  await logEvent({ action: "CASE_CANCELLED", description: `Anulowano sprawę „${kase.title}”`, caseId: id, userId: session.user.id });
  return NextResponse.json({ ok: true });
}
