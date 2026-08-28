import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { documentFilePath } from "@/lib/documentStorage";
import { NextResponse } from "next/server";
import { readFile, unlink } from "fs/promises";
import { DocumentKind, CaseStatus } from "@prisma/client";

function isVisibleNow(kind: DocumentKind, status: CaseStatus): boolean {
  if (status === CaseStatus.DRAFT) return false;
  if (kind === DocumentKind.RESULT) return status === CaseStatus.CLOSED || status === CaseStatus.RESULTS_PUBLISHED;
  return true; // DRAFT/ATTACHMENT widoczne od OPEN wzwyż
}

/** GET /api/documents/[id] - pobranie pliku po sprawdzeniu uprawnień (operator lub uczestnik sprawy). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const doc = await prisma.caseDocument.findUnique({ where: { id }, include: { item: { include: { case: true } } } });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  if (session.user.role !== "OPERATOR") {
    const participant = await prisma.caseParticipant.findUnique({ where: { caseId_userId: { caseId: doc.item.caseId, userId: session.user.id } } });
    if (!participant) return new NextResponse("Not found", { status: 404 });
    if (!isVisibleNow(doc.kind, doc.item.case.status)) return new NextResponse("Not found", { status: 404 });
  }

  try {
    const buf = await readFile(documentFilePath(doc.storedName));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Plik nie został odnaleziony", { status: 404 });
  }
}

/** DELETE /api/documents/[id] - operator może usunąć dokument w każdym momencie (bez logowania). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const doc = await prisma.caseDocument.findUnique({ where: { id } });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  await prisma.caseDocument.delete({ where: { id } });
  await unlink(documentFilePath(doc.storedName)).catch(() => {});
  return NextResponse.json({ ok: true });
}
