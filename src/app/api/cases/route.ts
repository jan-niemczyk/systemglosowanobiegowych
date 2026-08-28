import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CloseMode, ResultsVisibility } from "@prisma/client";

const schema = z.object({
  title: z.string().min(1).max(300),
  number: z.string().max(50).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  bodyId: z.string().nullable().optional(),
  closeMode: z.nativeEnum(CloseMode).optional(),
  resultsVisibility: z.nativeEnum(ResultsVisibility).optional(),
  allowVoteChange: z.boolean().optional(),
  deadlineAt: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const cases = await prisma.case.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: [{ createdAt: "desc" }],
    include: { body: true, _count: { select: { items: true, participants: true } } },
  });
  return NextResponse.json(cases.map((c) => ({
    id: c.id, number: c.number, title: c.title, status: c.status,
    bodyName: c.body?.name ?? null,
    itemCount: c._count.items, participantCount: c._count.participants,
    deadlineAt: c.deadlineAt, openedAt: c.openedAt, closedAt: c.closedAt, resultsPublishedAt: c.resultsPublishedAt,
    createdAt: c.createdAt,
  })));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });

  const settings = await prisma.settings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });

  const created = await prisma.case.create({
    data: {
      title: parsed.data.title,
      number: parsed.data.number ?? null,
      description: parsed.data.description ?? null,
      bodyId: parsed.data.bodyId ?? null,
      operatorId: session.user.id,
      closeMode: parsed.data.closeMode ?? settings.defaultCloseMode,
      resultsVisibility: parsed.data.resultsVisibility ?? settings.defaultResultsVisibility,
      allowVoteChange: parsed.data.allowVoteChange ?? settings.defaultAllowVoteChange,
      deadlineAt: parsed.data.deadlineAt ? new Date(parsed.data.deadlineAt) : null,
    },
  });

  await audit({ action: "CASE_CREATED", description: `Utworzono sprawę „${created.title}”`, caseId: created.id, userId: session.user.id });
  return NextResponse.json({ ok: true, id: created.id });
}
