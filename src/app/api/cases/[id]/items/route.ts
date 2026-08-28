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
  title: z.string().min(1).max(300),
  description: z.string().max(5000).nullable().optional(),
  type: z.nativeEnum(VoteType).default(VoteType.STANDARD),
  visibility: z.nativeEnum(VoteVisibility).default(VoteVisibility.OPEN),
  majorityKind: z.nativeEnum(MajorityKind).default(MajorityKind.SIMPLE),
  majorityBase: z.nativeEnum(MajorityBase).default(MajorityBase.OF_VOTERS),
  minSelections: z.number().int().min(0).nullable().optional(),
  maxSelections: z.number().int().min(0).nullable().optional(),
  options: z.array(optionSchema).optional().default([]),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const kase = await prisma.case.findUnique({ where: { id }, select: { status: true } });
  if (!kase) return new NextResponse("Not found", { status: 404 });
  if (kase.status !== CaseStatus.DRAFT) return new NextResponse("Pozycje można dodawać tylko w statusie „projekt”", { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });
  if (parsed.data.type !== VoteType.STANDARD && parsed.data.options.length === 0) {
    return new NextResponse("Ten typ głosowania wymaga co najmniej jednej opcji/pozycji", { status: 400 });
  }

  const last = await prisma.votingItem.findFirst({ where: { caseId: id }, orderBy: { order: "desc" } });
  const order = (last?.order ?? 0) + 1;

  const item = await prisma.votingItem.create({
    data: {
      caseId: id, order,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      visibility: parsed.data.visibility,
      majorityKind: parsed.data.majorityKind,
      majorityBase: parsed.data.majorityBase,
      minSelections: parsed.data.minSelections ?? null,
      maxSelections: parsed.data.maxSelections ?? null,
      options: {
        create: parsed.data.options.map((o, i) => ({ order: i, label: o.label, description: o.description ?? null })),
      },
    },
  });

  return NextResponse.json({ ok: true, id: item.id });
}
