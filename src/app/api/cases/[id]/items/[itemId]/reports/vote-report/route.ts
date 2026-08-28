import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderPdf, pdfResponse } from "@/lib/pdf";
import { toCsv, csvResponse } from "@/lib/csv";
import { formatDateTime } from "@/lib/labels";
import { buildItemReport } from "@/lib/voteReportData";
import { itemReportPdfContent } from "@/lib/voteReportPdf";
import { NextResponse } from "next/server";

/** GET .../items/[itemId]/reports/vote-report - jeden, spójny raport głosowania (PDF domyślnie, CSV na żądanie). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { itemId } = await ctx.params;
  const format = new URL(req.url).searchParams.get("format");

  const item = await prisma.votingItem.findUnique({
    where: { id: itemId },
    include: {
      case: { include: { participants: true } },
      options: { orderBy: { order: "asc" } },
      ballots: { include: { selections: true } },
    },
  });
  if (!item) return new NextResponse("Not found", { status: 404 });
  if (item.status !== "CLOSED") return new NextResponse("Głosowanie jeszcze nie zostało zamknięte - wyniki nie są dostępne.", { status: 400 });

  const block = buildItemReport(item, item.case.participants);

  if (format === "csv") {
    const rows: (string | number)[][] = [["Pozycja", block.title], ["Typ i jawność", block.typeVisibilityLine], [], block.summaryParts];
    if (block.packagePositions) {
      rows.push([], ["Pozycja", "Za", "Przeciw", "Wstrzym."]);
      for (const p of block.packagePositions) rows.push([p.label, p.yes, p.no, p.abstain]);
    }
    if (block.listCandidates) {
      rows.push([], ["Kandydat", "Głosów"]);
      for (const c of block.listCandidates) rows.push([c.label, c.yes]);
    }
    return csvResponse(`raport-glosowania-${itemId.slice(-8)}.csv`, toCsv(rows));
  }

  const buffer = await renderPdf({
    pageMargins: [40, 40, 40, 40],
    content: [
      { text: "Raport głosowania", fontSize: 16, bold: true, margin: [0, 0, 0, 2] },
      { text: item.case.title, fontSize: 10, color: "#555555", margin: [0, 0, 0, 10] },
      itemReportPdfContent(block),
      { text: `Wydruk wygenerowano: ${formatDateTime(new Date())}`, fontSize: 8, color: "#777777", margin: [0, 10, 0, 0] },
    ],
  });
  return pdfResponse(`raport-glosowania-${itemId.slice(-8)}.pdf`, buffer);
}
