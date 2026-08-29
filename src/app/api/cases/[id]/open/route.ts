import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/eventLog";
import { NextResponse } from "next/server";
import { CaseStatus, ItemStatus } from "@prisma/client";

/**
 * POST /api/cases/[id]/open
 * Walidacja gotowości (sekcja 7): co najmniej jeden uczestnik i jedna pozycja
 * głosowania. Dokumenty są opcjonalne. Po otwarciu treść wpływająca na
 * głosowanie (skład, pozycje) jest zamrożona.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const kase = await prisma.case.findUnique({
    where: { id },
    include: { participants: true, items: true },
  });
  if (!kase) return new NextResponse("Not found", { status: 404 });
  if (kase.status !== CaseStatus.DRAFT) return new NextResponse("Sprawa nie jest w statusie „projekt”", { status: 400 });

  const errors: string[] = [];
  if (kase.participants.length === 0) errors.push("Brak uczestników uprawnionych w sprawie.");
  if (kase.items.length === 0) errors.push("Brak co najmniej jednej pozycji głosowania.");
  if (errors.length > 0) return NextResponse.json({ ok: false, errors }, { status: 400 });

  await prisma.$transaction([
    prisma.case.update({ where: { id }, data: { status: CaseStatus.OPEN, openedAt: new Date() } }),
    prisma.votingItem.updateMany({ where: { caseId: id }, data: { status: ItemStatus.OPEN } }),
  ]);

  await logEvent({ action: "CASE_OPENED", description: "Sprawa otwarta - rozpoczęto głosowanie", caseId: id, userId: session.user.id });
  return NextResponse.json({ ok: true });
}
