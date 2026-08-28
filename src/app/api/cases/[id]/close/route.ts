import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { closeCase } from "@/lib/closeCase";
import { NextResponse } from "next/server";
import { CaseStatus } from "@prisma/client";

/** POST /api/cases/[id]/close - ręczne zamknięcie sprawy przez operatora. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const kase = await prisma.case.findUnique({ where: { id }, select: { status: true } });
  if (!kase) return new NextResponse("Not found", { status: 404 });
  if (kase.status !== CaseStatus.OPEN) return new NextResponse("Sprawa nie jest otwarta", { status: 400 });

  await closeCase(id, { closedByUserId: session.user.id, reason: "ręcznie przez operatora" });
  return NextResponse.json({ ok: true });
}
