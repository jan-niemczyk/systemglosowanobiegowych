import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderPdf, pdfResponse } from "@/lib/pdf";
import { buildItemReport, type ReportCaseInfo } from "@/lib/voteReportData";
import { itemReportPdfContent } from "@/lib/voteReportPdf";
import { NextResponse } from "next/server";

/** GET .../items/[itemId]/reports/vote-report - jeden, spójny raport głosowania (PDF), 1:1 z iOBRAD. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { itemId } = await ctx.params;

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

  const headLabel = `Głosowanie nr ${block.order}`;

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
