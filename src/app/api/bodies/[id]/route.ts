import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/eventLog";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const body = await prisma.body.findUnique({
    where: { id },
    include: { members: { include: { user: true }, orderBy: { user: { lastName: "asc" } } } },
  });
  if (!body) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json({
    id: body.id, name: body.name, description: body.description,
    members: body.members.map((m) => ({
      id: m.id, userId: m.userId, hasVotingRight: m.hasVotingRight,
      firstName: m.user.firstName, lastName: m.user.lastName, email: m.user.email, active: m.user.active,
    })),
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });
  await prisma.body.update({ where: { id }, data: parsed.data });
  await logEvent({ action: "BODY_UPDATED", description: "Zaktualizowano dane organu", caseId: undefined, userId: session.user.id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const body = await prisma.body.findUnique({ where: { id } });
  if (!body) return new NextResponse("Not found", { status: 404 });
  await prisma.body.delete({ where: { id } });
  await logEvent({ action: "BODY_DELETED", description: `Usunięto organ „${body.name}”`, userId: session.user.id });
  return NextResponse.json({ ok: true });
}
