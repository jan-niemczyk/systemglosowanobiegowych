import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { newStoredFileName } from "@/lib/ids";
import { DOCUMENT_STORAGE_DIR, documentFilePath } from "@/lib/documentStorage";
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { DocumentKind, CaseStatus } from "@prisma/client";

/** Dokumenty widoczne uczestnikowi zależnie od etapu sprawy (sekcja 8). */
function visibleKindsForStatus(status: CaseStatus): DocumentKind[] {
  if (status === CaseStatus.DRAFT) return [];
  if (status === CaseStatus.OPEN) return [DocumentKind.DRAFT, DocumentKind.ATTACHMENT];
  if (status === CaseStatus.CLOSED || status === CaseStatus.RESULTS_PUBLISHED) {
    return [DocumentKind.DRAFT, DocumentKind.ATTACHMENT, DocumentKind.RESULT];
  }
  return [];
}

/** GET .../items/[itemId]/documents - lista dokumentów pozycji głosowania. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { id, itemId } = await ctx.params;

  const item = await prisma.votingItem.findUnique({ where: { id: itemId }, include: { case: true } });
  if (!item || item.caseId !== id) return new NextResponse("Not found", { status: 404 });

  let allowedKinds: DocumentKind[] | null = null;
  if (session.user.role !== "OPERATOR") {
    const participant = await prisma.caseParticipant.findUnique({ where: { caseId_userId: { caseId: id, userId: session.user.id } } });
    if (!participant) return new NextResponse("Not found", { status: 404 });
    allowedKinds = visibleKindsForStatus(item.case.status);
  }

  const docs = await prisma.caseDocument.findMany({
    where: { itemId, ...(allowedKinds ? { kind: { in: allowedKinds } } : {}) },
    orderBy: { uploadedAt: "asc" },
  });
  return NextResponse.json(docs.map((d) => ({
    id: d.id, kind: d.kind, fileName: d.fileName, mimeType: d.mimeType, sizeBytes: d.sizeBytes, uploadedAt: d.uploadedAt,
  })));
}

/** POST .../items/[itemId]/documents - wgranie dokumentu do pozycji głosowania (multipart/form-data: file, kind). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id, itemId } = await ctx.params;

  const item = await prisma.votingItem.findUnique({ where: { id: itemId }, include: { case: true } });
  if (!item || item.caseId !== id) return new NextResponse("Not found", { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kindRaw = form?.get("kind");
  if (!(file instanceof File)) return new NextResponse("Brak pliku", { status: 400 });
  if (typeof kindRaw !== "string" || !(kindRaw in DocumentKind)) return new NextResponse("Nieprawidłowy rodzaj dokumentu", { status: 400 });
  const kind = kindRaw as DocumentKind;

  // Operator może swobodnie wymieniać dokumenty w każdym momencie - bez ograniczeń
  // na status sprawy i bez logowania w rejestrze zdarzeń (na wyraźne życzenie).

  const settings = await prisma.settings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!settings.allowedDocumentTypes.includes(ext)) {
    return new NextResponse(`Niedozwolony typ pliku. Dozwolone: ${settings.allowedDocumentTypes.join(", ")}`, { status: 400 });
  }
  if (file.size > settings.maxDocumentSizeMB * 1024 * 1024) {
    return new NextResponse(`Plik przekracza limit ${settings.maxDocumentSizeMB} MB`, { status: 400 });
  }

  try {
    await mkdir(DOCUMENT_STORAGE_DIR, { recursive: true });
    const storedName = `${newStoredFileName()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(documentFilePath(storedName), buffer);

    const doc = await prisma.caseDocument.create({
      data: {
        itemId, kind, fileName: file.name, storedName,
        mimeType: file.type || "application/octet-stream", sizeBytes: file.size,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({ ok: true, id: doc.id });
  } catch (err) {
    console.error("Błąd zapisu dokumentu:", err);
    return new NextResponse("Nie udało się zapisać pliku na serwerze", { status: 500 });
  }
}
