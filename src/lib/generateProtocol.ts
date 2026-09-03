/**
 * Protokół sprawy w formacie DOCX (Arial) - treść 1:1 z wersją PDF ("Protokół",
 * dawna "zbiorcza karta sprawy"): metadane, uprawnieni do głosowania i pod każdą
 * pozycją jej raport głosowania (podsuma + wyniki imienne).
 */
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel } from "docx";
import { formatDateTimeSeconds } from "@/lib/labels";
import { buildItemReport, type ReportItemInput, type ReportParticipant, type ReportCaseInfo } from "@/lib/voteReportData";
import { itemReportDocxBlocks } from "@/lib/voteReportDocx";

const FONT = "Arial";

export interface ProtocolCase {
  title: string;
  description: string | null;
  openedAt: Date | null;
  deadlineAt: Date | null;
  closedAt: Date | null;
  body: { name: string } | null;
  participants: (ReportParticipant & { userId: string })[];
  items: (ReportItemInput & { status: string })[];
}

function p(text: string, opts: { bold?: boolean; italics?: boolean; size?: number } = {}): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size ?? 20, font: FONT })], spacing: { after: 120 } });
}

function cell(text: string, header = false, width = 50): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text, bold: header, size: 18, font: FONT })] })],
  });
}

export async function generateProtocolDocx(kase: ProtocolCase, organizationName: string): Promise<Buffer> {
  const caseInfo: ReportCaseInfo = { organizationName, caseTitle: kase.title, caseNumber: null, closedAt: kase.closedAt };
  const votedUserIds = new Set<string>();
  for (const item of kase.items) {
    for (const b of item.ballots) if (b.userId) votedUserIds.add(b.userId);
  }

  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: organizationName, heading: HeadingLevel.HEADING_3, run: { font: FONT }, spacing: { after: 80 } }),
    new Paragraph({ text: "Protokół", heading: HeadingLevel.HEADING_1, run: { font: FONT }, spacing: { after: 100 } }),
    p(kase.title, { bold: true, size: 26 }),
  ];

  const metaRows: [string, string][] = [
    ["Organ", kase.body?.name ?? "-"],
    ["Otwarto", formatDateTimeSeconds(kase.openedAt)],
    ["Termin końcowy", formatDateTimeSeconds(kase.deadlineAt)],
    ["Zamknięto", formatDateTimeSeconds(kase.closedAt)],
  ];
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: metaRows.map(([k, v]) => new TableRow({ cantSplit: true, children: [cell(k, true, 30), cell(v, false, 70)] })),
  }));
  children.push(p(""));

  if (kase.description) children.push(p(kase.description, { italics: true }));

  children.push(new Paragraph({ text: "Uprawnieni do głosowania", heading: HeadingLevel.HEADING_2, run: { font: FONT }, spacing: { before: 100, after: 80 } }));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ cantSplit: true, tableHeader: true, children: [cell("Nazwisko i imię", true, 70), cell("Wziął/wzięła udział w głosowaniu", true, 30)] }),
      ...kase.participants.map((part) => new TableRow({
        cantSplit: true,
        children: [cell(`${part.lastName} ${part.firstName}`, false, 70), cell(votedUserIds.has(part.userId) ? "tak" : "nie", false, 30)],
      })),
    ],
  }));
  children.push(p(""));

  children.push(new Paragraph({ text: "Sprawy:", heading: HeadingLevel.HEADING_2, run: { font: FONT }, spacing: { before: 100, after: 80 } }));

  for (const item of kase.items) {
    if (item.status === "CLOSED") {
      const block = buildItemReport(item, kase.participants, caseInfo);
      children.push(...itemReportDocxBlocks(block));
    } else {
      children.push(p(`${item.order}. ${item.title}`, { bold: true, size: 22 }));
      children.push(p("Głosowanie jeszcze nie zostało zamknięte.", { italics: true }));
    }
  }

  children.push(new Paragraph({
    children: [new TextRun({ text: `Wydruk wygenerowano: ${formatDateTimeSeconds(new Date())}`, size: 16, font: FONT })],
    spacing: { before: 300 },
  }));

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}
