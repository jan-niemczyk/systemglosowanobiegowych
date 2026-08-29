import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/eventLog";
import { documentFilePath } from "@/lib/documentStorage";
import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { z } from "zod";
import { CloseMode, ResultsVisibility, CaseStatus } from "@prisma/client";

const schema = z.object({
  title: z.string().min(1).max(300).optional(),
  number: z.string().max(50).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  bodyId: z.string().nullable().optional(),
  closeMode: z.nativeEnum(CloseMode).optional(),
  resultsVisibility: z.nativeEnum(ResultsVisibility).optional(),
  allowVoteChange: z.boolean().optional(),
  deadlineAt: z.string().nullable().optional(),
});

async function loadForOperator(id: string) {
  return prisma.case.findUnique({
    where: { id },
    include: {
      body: true,
      operator: true,
      participants: { include: { user: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
      items: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } }, documents: { orderBy: { uploadedAt: "asc" } } },
      },
    },
  });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  if (session.user.role !== "OPERATOR") {
    // Uczestnik widzi sprawę tylko jeśli jest w jej składzie.
    const isParticipant = await prisma.caseParticipant.findUnique({ where: { caseId_userId: { caseId: id, userId: session.user.id } } });
    if (!isParticipant) return new NextResponse("Not found", { status: 404 });
  }

  const kase = await loadForOperator(id);
  if (!kase) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(kase);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const kase = await prisma.case.findUnique({ where: { id } });
  if (!kase) return new NextResponse("Not found", { status: 404 });
  if (kase.status !== CaseStatus.DRAFT) {
    return new NextResponse("Sprawę można edytować tylko w statusie „projekt”", { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.deadlineAt !== undefined) data.deadlineAt = parsed.data.deadlineAt ? new Date(parsed.data.deadlineAt) : null;

  await prisma.case.update({ where: { id }, data });
  await logEvent({ action: "CASE_UPDATED", description: "Zaktualizowano dane sprawy", caseId: id, userId: session.user.id });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/cases/[id] - operator może usunąć sprawę w KAŻDYM statusie (na wyraźne
 * życzenie), także zamkniętą z oddanymi głosami - to nieodwracalne kasuje głosy, skład i
 * dokumenty (kaskada w schemacie). Wpis w rejestrze zdarzeń zostaje (caseId -> null),
 * z metadanymi identyfikującymi usuniętą sprawę, bo po usunięciu to jedyny ślad.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const kase = await prisma.case.findUnique({ where: { id }, include: { participants: true, items: true } });
  if (!kase) return new NextResponse("Not found", { status: 404 });

  const docs = await prisma.caseDocument.findMany({ where: { item: { caseId: id } }, select: { storedName: true } });

  await prisma.case.delete({ where: { id } });
  await Promise.all(docs.map((d) => unlink(documentFilePath(d.storedName)).catch(() => {})));

  await logEvent({
    action: "CASE_DELETED",
    description: `Usunięto sprawę „${kase.title}”`,
    userId: session.user.id,
    metadata: {
      number: kase.number, title: kase.title, status: kase.status,
      participantsCount: kase.participants.length, itemsCount: kase.items.length,
    },
  });
  return NextResponse.json({ ok: true });
}
