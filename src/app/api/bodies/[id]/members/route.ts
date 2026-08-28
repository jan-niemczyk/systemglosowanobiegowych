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

  await prisma.bodyMembership.createMany({
    data: parsed.data.userIds.map((userId) => ({ bodyId: id, userId, hasVotingRight: parsed.data.hasVotingRight })),
    skipDuplicates: true,
  });
  return NextResponse.json({ ok: true });
}
