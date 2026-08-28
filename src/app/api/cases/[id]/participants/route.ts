import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CaseStatus } from "@prisma/client";

const schema = z.object({
  userIds: z.array(z.string()).optional(),
  bodyId: z.string().optional(),
  hasVotingRight: z.boolean().optional().default(true),
});

async function assertDraft(caseId: string) {
  const kase = await prisma.case.findUnique({ where: { id: caseId }, select: { status: true } });
  if (!kase) return "Not found";
  if (kase.status !== CaseStatus.DRAFT) return "Skład można korygować tylko w statusie „projekt”";
  return null;
}

/** POST /api/cases/[id]/participants - dodaje osoby ręcznie (userIds) lub cały skład organu (bodyId). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const err = await assertDraft(id);
  if (err) return new NextResponse(err, { status: err === "Not found" ? 404 : 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });

  let candidates: { userId: string; hasVotingRight: boolean }[] = [];
  if (parsed.data.bodyId) {
    const members = await prisma.bodyMembership.findMany({ where: { bodyId: parsed.data.bodyId } });
    candidates = members.map((m) => ({ userId: m.userId, hasVotingRight: m.hasVotingRight }));
  }
  if (parsed.data.userIds?.length) {
    candidates = candidates.concat(parsed.data.userIds.map((userId) => ({ userId, hasVotingRight: parsed.data.hasVotingRight ?? true })));
  }
  if (candidates.length === 0) return new NextResponse("Brak osób do dodania", { status: 400 });

  const users = await prisma.user.findMany({ where: { id: { in: candidates.map((c) => c.userId) } } });
  const byId = new Map(users.map((u) => [u.id, u]));

  const data = candidates
    .filter((c) => byId.has(c.userId))
    .map((c) => {
      const u = byId.get(c.userId)!;
      return { caseId: id, userId: c.userId, hasVotingRight: c.hasVotingRight, firstName: u.firstName, lastName: u.lastName };
    });

  await prisma.caseParticipant.createMany({ data, skipDuplicates: true });
  await audit({ action: "PARTICIPANT_ADDED", description: `Dodano ${data.length} osób do składu sprawy`, caseId: id, userId: session.user.id });
  return NextResponse.json({ ok: true, added: data.length });
}
