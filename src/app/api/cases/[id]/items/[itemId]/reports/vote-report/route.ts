import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderPdf, pdfResponse } from "@/lib/pdf";
import { toCsv, csvResponse } from "@/lib/csv";
import { buildItemReport, type ReportCaseInfo } from "@/lib/voteReportData";
import { itemReportPdfContent } from "@/lib/voteReportPdf";
import { NextResponse } from "next/server";

/** GET .../items/[itemId]/reports/vote-report - jeden, spójny raport głosowania (PDF domyślnie, CSV na żądanie), 1:1 z iOBRAD. */
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

  const settings = await prisma.settings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
  const caseInfo: ReportCaseInfo = {
    organizationName: settings.organizationName,
    caseTitle: item.case.title,
    caseNumber: item.case.number,
    closedAt: item.case.closedAt,
  };
  const block = buildItemReport(item, item.case.participants, caseInfo);

  if (format === "csv") {
    const rows: (string | number)[][] = [["Pozycja", block.title], []];
    if (block.secret) rows.push(["Głosowanie tajne"], []);
    rows.push(block.summaryParts);
    if (block.candidates) rows.push([], ["Kandydaci wg kolejności na liście"], ...block.candidates.map((c, i) => [`${i + 1}.`, c]));
    if (block.packagePositions) {
      rows.push([], ["Pozycja", "Za", "Przeciw", "Wstrzym."]);
      for (const p of block.packagePositions) rows.push([p.label, p.yes, p.no, p.abstain]);
    }
    if (block.listCandidates) {
      rows.push([], ["Kandydat", "Głosów"]);
      for (const c of block.listCandidates) rows.push([c.label, c.yes]);
    }
    if (block.againstAllCount != null) rows.push([], [`Nie poparło żadnej kandydatury: ${block.againstAllCount}`]);
    return csvResponse(`raport-glosowania-${itemId.slice(-8)}.csv`, toCsv(rows));
  }

  const headLabel = caseInfo.caseNumber
    ? `Sprawa nr ${caseInfo.caseNumber} - głosowanie nr ${block.order}`
    : `Głosowanie nr ${block.order}`;

  const buffer = await renderPdf({
    pageMargins: [40, 48, 40, 40],
    content: [itemReportPdfContent(block, { standalone: true })],
    header: (currentPage: number, pageCount: number) => ({
      margin: [40, 20, 40, 0],
      columns: [
        { text: headLabel, fontSize: 8 },
        { text: `Strona ${currentPage} z ${pageCount}`, fontSize: 8, alignment: "right" },
      ],
    }),
    info: { title: `raport-glosowania-${itemId.slice(-8)}` },
  });
  return pdfResponse(`raport-glosowania-${itemId.slice(-8)}.pdf`, buffer);
}
