import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ hasVotingRight: z.boolean() });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; userId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id, userId } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });
  await prisma.bodyMembership.update({
    where: { bodyId_userId: { bodyId: id, userId } },
    data: { hasVotingRight: parsed.data.hasVotingRight },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; userId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id, userId } = await ctx.params;
  await prisma.bodyMembership.delete({ where: { bodyId_userId: { bodyId: id, userId } } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
