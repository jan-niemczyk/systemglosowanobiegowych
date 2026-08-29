import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderPdf, pdfResponse } from "@/lib/pdf";
import { formatDateTimeSeconds } from "@/lib/labels";
import { buildItemReport, type ReportCaseInfo } from "@/lib/voteReportData";
import { itemReportPdfContent } from "@/lib/voteReportPdf";
import { NextResponse } from "next/server";

/**
 * GET /api/cases/[id]/reports/case-card - "Protokół" sprawy (PDF): metadane, skład
 * uprawnionych i pod każdą pozycją głosowania jej raport (podsuma + wyniki imienne),
 * dokładnie jak samodzielny raport głosowania. Bez numeru sprawy, statusu, operatora
 * i reguł większości - wyłącznie zliczenie głosów.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const kase = await prisma.case.findUnique({
    where: { id },
    include: {
      body: true,
      participants: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
      items: {
        orderBy: { order: "asc" },
        include: {
          options: { orderBy: { order: "asc" } },
          ballots: { include: { selections: true } },
          secretMarkers: { select: { userId: true } },
        },
      },
    },
  });
  if (!kase) return new NextResponse("Not found", { status: 404 });
  const settings = await prisma.settings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
  const caseInfo: ReportCaseInfo = { organizationName: settings.organizationName, caseTitle: kase.title, caseNumber: null, closedAt: kase.closedAt };

  const votedUserIds = new Set<string>();
  for (const item of kase.items) {
    for (const b of item.ballots) if (b.userId) votedUserIds.add(b.userId);
    for (const m of item.secretMarkers) votedUserIds.add(m.userId);
  }

  const content: unknown[] = [
    { text: settings.organizationName, fontSize: 9 },
    { text: "Protokół", fontSize: 16, bold: true, margin: [0, 4, 0, 2] },
    { text: kase.title, fontSize: 13, margin: [0, 0, 0, 8] },
    {
      table: {
        widths: ["auto", "*"],
        body: [
          ["Organ", kase.body?.name ?? "-"],
          ["Otwarto", formatDateTimeSeconds(kase.openedAt)],
          ["Termin końcowy", formatDateTimeSeconds(kase.deadlineAt)],
          ["Zamknięto", formatDateTimeSeconds(kase.closedAt)],
        ],
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 12],
    },
  ];

  if (kase.description) content.push({ text: kase.description, fontSize: 10, margin: [0, 0, 0, 12] });

  content.push({ text: "Uprawnieni do głosowania", fontSize: 12, bold: true, margin: [0, 8, 0, 4] });
  content.push({
    table: {
      widths: ["*", "auto"],
      body: [
        ["Nazwisko i imię", "Wziął/wzięła udział w głosowaniu"],
        ...kase.participants.map((p) => [`${p.lastName} ${p.firstName}`, votedUserIds.has(p.userId) ? "tak" : "nie"]),
      ],
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 12],
  });

  content.push({ text: "Pozycje:", fontSize: 12, bold: true, margin: [0, 8, 0, 4] });

  for (const item of kase.items) {
    if (item.status === "CLOSED") {
      const block = buildItemReport(item, kase.participants, caseInfo);
      content.push(itemReportPdfContent(block, { standalone: false }));
    } else {
      content.push({
        stack: [
          { text: `${item.order}. ${item.title}`, fontSize: 11, bold: true, margin: [0, 6, 0, 2] },
          { text: "Głosowanie jeszcze nie zostało zamknięte.", fontSize: 9, italics: true, margin: [0, 2, 0, 4] },
        ],
        unbreakable: true,
      });
    }
  }

  content.push({
    text: `Wydruk wygenerowano: ${formatDateTimeSeconds(new Date())}`,
    fontSize: 8, margin: [0, 16, 0, 0],
  });

  const buffer = await renderPdf({ content, pageMargins: [40, 40, 40, 40] });
  return pdfResponse(`protokol-${kase.id.slice(-8)}.pdf`, buffer);
}
