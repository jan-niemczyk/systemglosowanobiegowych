import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  title: z.string().trim().min(1).max(300),
});

/**
 * PATCH .../title - zmiana tematu (tytułu) pozycji głosowania, dostępna w każdym
 * statusie sprawy (przed, w trakcie i po głosowaniu) - na wyraźne życzenie operatora.
 * Tylko tytuł; typ/opcje/jawność pozostają edytowalne wyłącznie w statusie DRAFT
 * (patrz .../items/[itemId]/route.ts), bo ich zmiana w trakcie unieważniłaby głosy.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id, itemId } = await ctx.params;

  const item = await prisma.votingItem.findUnique({ where: { id: itemId }, select: { caseId: true } });
  if (!item || item.caseId !== id) return new NextResponse("Not found", { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });

  await prisma.votingItem.update({ where: { id: itemId }, data: { title: parsed.data.title } });
  return NextResponse.json({ ok: true });
}
