import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  userIds: z.array(z.string()).min(1),
  hasVotingRight: z.boolean().optional().default(true),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });

  // Operator nie może brać udziału w głosowaniu - nie wchodzi w skład organu.
  const eligible = await prisma.user.findMany({ where: { id: { in: parsed.data.userIds }, role: "PARTICIPANT" }, select: { id: true } });

  await prisma.bodyMembership.createMany({
    data: eligible.map((u) => ({ bodyId: id, userId: u.id, hasVotingRight: parsed.data.hasVotingRight })),
    skipDuplicates: true,
  });
  return NextResponse.json({ ok: true });
}
