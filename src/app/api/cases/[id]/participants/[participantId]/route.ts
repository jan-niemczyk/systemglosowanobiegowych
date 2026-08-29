import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/eventLog";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CaseStatus } from "@prisma/client";

const schema = z.object({ hasVotingRight: z.boolean() });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; participantId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id, participantId } = await ctx.params;

  const kase = await prisma.case.findUnique({ where: { id }, select: { status: true } });
  if (!kase) return new NextResponse("Not found", { status: 404 });
  if (kase.status !== CaseStatus.DRAFT) return new NextResponse("Skład można korygować tylko w statusie „projekt”", { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });

  await prisma.caseParticipant.update({ where: { id: participantId }, data: { hasVotingRight: parsed.data.hasVotingRight } });
  await logEvent({ action: "PARTICIPANT_RIGHT_CHANGED", description: "Zmieniono prawo głosu uczestnika sprawy", caseId: id, userId: session.user.id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; participantId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id, participantId } = await ctx.params;

  const kase = await prisma.case.findUnique({ where: { id }, select: { status: true } });
  if (!kase) return new NextResponse("Not found", { status: 404 });
  if (kase.status !== CaseStatus.DRAFT) return new NextResponse("Skład można korygować tylko w statusie „projekt”", { status: 400 });

  await prisma.caseParticipant.delete({ where: { id: participantId } }).catch(() => null);
  await logEvent({ action: "PARTICIPANT_REMOVED", description: "Usunięto osobę ze składu sprawy", caseId: id, userId: session.user.id });
  return NextResponse.json({ ok: true });
}
