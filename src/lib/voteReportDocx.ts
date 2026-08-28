/**
 * Renderer docx dla ItemReportBlock (patrz voteReportData.ts) - ta sama treść co
 * w raporcie PDF, w wersji Word (font Arial). Wiersze tabel mają cantSplit, a
 * akapity keepNext, żeby cały blok pozycji możliwie nie łamał się między stronami.
 */
import { Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from "docx";
import type { ItemReportBlock } from "@/lib/voteReportData";

const FONT = "Arial";

function p(text: string, opts: { bold?: boolean; italics?: boolean; size?: number } = {}): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size ?? 18, font: FONT })],
    keepNext: true,
    spacing: { after: 80 },
  });
}

function cell(text: string, header = false, width = 50): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text, bold: header, size: 18, font: FONT })] })],
  });
}

function row(cells: TableCell[], header = false): TableRow {
  return new TableRow({ cantSplit: true, tableHeader: header, children: cells });
}

function simpleTable(headers: string[], rows: string[][]): Table {
  const w = 100 / headers.length;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [row(headers.map((h) => cell(h, true, w)), true), ...rows.map((r) => row(r.map((v) => cell(v, false, w))))],
  });
}

function packagePositionsTable(positions: { label: string; yes: number; no: number; abstain: number }[]): Table {
  return simpleTable(
    ["Pozycja", "Za", "Przeciw", "Wstrzym."],
    positions.map((p) => [p.label, String(p.yes), String(p.no), String(p.abstain)]),
  );
}

function candidatesTable(candidates: { label: string; yes: number }[]): Table {
  const sorted = [...candidates].sort((a, b) => a.label.localeCompare(b.label, "pl"));
  return simpleTable(["Kandydat", "Głosów"], sorted.map((c) => [c.label, String(c.yes)]));
}

export function itemReportDocxBlocks(block: ItemReportBlock): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [
    new Paragraph({
      children: [new TextRun({ text: `${block.order}. ${block.title}`, bold: true, size: 24, font: FONT })],
      keepNext: true, spacing: { before: 200, after: 80 },
    }),
    p(block.typeVisibilityLine),
    new Paragraph({
      children: [new TextRun({ text: block.summaryParts.join("    "), bold: true, size: 20, font: FONT })],
      keepNext: true, spacing: { after: 80 },
    }),
  ];

  if (block.secret) {
    out.push(p("Głosowanie tajne - bez wykazu imiennego.", { italics: true }));
    if (block.packagePositions) out.push(packagePositionsTable(block.packagePositions));
    if (block.listCandidates) out.push(candidatesTable(block.listCandidates));
  } else {
    if (block.standardRows) {
      out.push(simpleTable(["Nazwisko i imię", "Głos"], block.standardRows.map((r) => [r.name, r.mark])));
    }
    if (block.packagePositions) out.push(packagePositionsTable(block.packagePositions));
    if (block.packageRows && block.packagePositions) {
      out.push(simpleTable(
        ["Nazwisko i imię", ...block.packagePositions.map((p) => p.label)],
        block.packageRows.map((r) => [r.name, ...r.marks]),
      ));
    }
    if (block.listCandidates) out.push(candidatesTable(block.listCandidates));
    if (block.listVoterRows && block.listVoterRows.length && block.listCandidates) {
      out.push(simpleTable(
        ["Nazwisko i imię", ...block.listCandidates.map((c) => c.label)],
        block.listVoterRows.map((r) => [r.name, ...r.marks.map((m) => (m ? "za" : ""))]),
      ));
    }
    if (block.listNonVoterNames && block.listNonVoterNames.length) {
      out.push(p("Niegłosujący:", { bold: true }));
      out.push(...block.listNonVoterNames.map((n) => p(n)));
    }
  }

  return out;
}
