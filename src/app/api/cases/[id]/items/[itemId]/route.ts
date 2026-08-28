import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CaseStatus, VoteType, VoteVisibility, MajorityKind, MajorityBase } from "@prisma/client";

const optionSchema = z.object({
  label: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
});

const schema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).nullable().optional(),
  type: z.nativeEnum(VoteType).optional(),
  visibility: z.nativeEnum(VoteVisibility).optional(),
  majorityKind: z.nativeEnum(MajorityKind).optional(),
  majorityBase: z.nativeEnum(MajorityBase).optional(),
  minSelections: z.number().int().min(0).nullable().optional(),
  maxSelections: z.number().int().min(0).nullable().optional(),
  options: z.array(optionSchema).optional(),
});

async function assertDraft(caseId: string) {
  const kase = await prisma.case.findUnique({ where: { id: caseId }, select: { status: true } });
  if (!kase) return "Not found";
  if (kase.status !== CaseStatus.DRAFT) return "Pozycje można edytować tylko w statusie „projekt”";
  return null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id, itemId } = await ctx.params;

  const err = await assertDraft(id);
  if (err) return new NextResponse(err, { status: err === "Not found" ? 404 : 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });

  const { options, ...rest } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.votingItem.update({ where: { id: itemId }, data: rest });
    if (options) {
      await tx.voteOption.deleteMany({ where: { itemId } });
      await tx.voteOption.createMany({
        data: options.map((o, i) => ({ itemId, order: i, label: o.label, description: o.description ?? null })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id, itemId } = await ctx.params;

  const err = await assertDraft(id);
  if (err) return new NextResponse(err, { status: err === "Not found" ? 404 : 400 });

  await prisma.votingItem.delete({ where: { id: itemId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
