/**
 * Renderer docx dla ItemReportBlock (patrz voteReportData.ts) - ta sama treść i kolejność
 * sekcji co w raporcie PDF (voteReportPdf.ts, port 1:1 z iOBRAD), w wersji Word (font Arial).
 * Układ dwukolumnowy pdfmake (nazwiska w dwóch kolumnach obok siebie) jest w Wordzie
 * przybliżony jedną pełnoszerokościową tabelą - sekcje, ich kolejność i treść są identyczne,
 * wyłącznie wizualny podział na kolumny nie ma bezpośredniego odpowiednika w docx. Wiersze
 * tabel mają cantSplit, a akapity keepNext, żeby blok możliwie nie łamał się między stronami.
 */
import { Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from "docx";
import type { ItemReportBlock } from "@/lib/voteReportData";
import { formatDateTimeSeconds } from "@/lib/labels";

const FONT = "Arial";

function p(text: string, opts: { bold?: boolean; italics?: boolean; size?: number } = {}): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size ?? 18, font: FONT })],
    keepNext: true,
    spacing: { after: 80 },
  });
}

function cell(text: string, header = false, width = 50, align: "left" | "right" | "center" = "left"): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ alignment: align === "left" ? undefined : align, children: [new TextRun({ text, bold: header, size: 18, font: FONT })] })],
  });
}

function row(cells: TableCell[], header = false): TableRow {
  return new TableRow({ cantSplit: true, tableHeader: header, children: cells });
}

function simpleTable(headers: string[], rows: string[][], aligns?: ("left" | "right" | "center")[]): Table {
  const w = 100 / headers.length;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      row(headers.map((h, i) => cell(h, true, w, aligns?.[i] ?? "left")), true),
      ...rows.map((r) => row(r.map((v, i) => cell(v, false, w, aligns?.[i] ?? "left")))),
    ],
  });
}

function gridTable(rows: { name: string; marks: string[] }[], nCols: number): Table {
  const headers = ["Lp.", "Nazwisko i imię", ...Array.from({ length: nCols }, (_, i) => String(i + 1))];
  const body = rows.map((r, idx) => [String(idx + 1), r.name, ...r.marks]);
  const aligns: ("left" | "right" | "center")[] = ["left", "left", ...Array.from({ length: nCols }, () => "center" as const)];
  return simpleTable(headers, body, aligns);
}

function nonVotersTable(names: string[]): Table {
  return simpleTable(["Lp.", "Nazwisko i imię", ""], names.map((n, i) => [String(i + 1), n, "ng."]), ["left", "left", "center"]);
}

function packagePositionsTable(positions: { label: string; yes: number; no: number; abstain: number }[]): Table {
  return simpleTable(
    ["Nr", "Pozycja", "Za", "Przeciw", "Wstrzym."],
    positions.map((pos, i) => [String(i + 1), pos.label, String(pos.yes), String(pos.no), String(pos.abstain)]),
    ["left", "left", "center", "center", "center"],
  );
}

function candidatesTable(candidates: { label: string; yes: number }[]): Table {
  return simpleTable(["Kandydat", "Głosów"], candidates.map((c) => [c.label, String(c.yes)]), ["left", "right"]);
}

function twoColumnMarks(rows: { name: string; mark: string }[]): Table {
  return simpleTable(["Nazwisko i imię", "Głos"], rows.map((r) => [r.name, r.mark]), ["left", "right"]);
}

// Odmiana: 1 -> "osoba nie poparła"; 2-4 (poza 12-14) -> "osoby nie poparły"; reszta -> "osób nie poparło".
function againstAllSentence(n: number): string {
  const lastTwo = n % 100, last = n % 10;
  const isFew = last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
  const noun = n === 1 ? "osoba" : isFew ? "osoby" : "osób";
  const verb = n === 1 ? "nie poparła" : isFew ? "nie poparły" : "nie poparło";
  return `Żadnej kandydatury ${verb} ${n} ${noun}.`;
}

export function itemReportDocxBlocks(block: ItemReportBlock, opts: { standalone: boolean } = { standalone: false }): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  const isList = block.candidates != null;
  const isPackage = block.packagePositions != null && block.candidates == null;

  if (opts.standalone) {
    const { caseInfo } = block;
    if (caseInfo.organizationName) out.push(p(caseInfo.organizationName));
    if (caseInfo.caseTitle) out.push(p(caseInfo.caseTitle));
    const ts = formatDateTimeSeconds(caseInfo.closedAt);
    const head = `Głosowanie nr ${block.order} (${ts})`;
    out.push(p(head, { bold: true, size: 20 }));
  }

  if (block.secret) out.push(p("Głosowanie tajne", { bold: true, size: 20 }));

  out.push(new Paragraph({
    children: [new TextRun({ text: `${block.order}. ${block.title}`, size: 22, font: FONT })],
    keepNext: true, spacing: { before: 200, after: 80 },
  }));
  if (block.description) out.push(p(block.description));
  if (isList && block.candidatesCount) out.push(p(`${block.candidatesCount} kandydatów`));

  const summary = (parts: string[]) => new Paragraph({
    children: [new TextRun({ text: parts.join("    "), bold: true, size: 20, font: FONT })],
    keepNext: true, spacing: { before: 80, after: 200 },
  });

  if (!isPackage) out.push(summary(block.summaryParts));

  if (isList && block.candidates && block.candidates.length > 0) {
    out.push(p("Kandydaci według kolejności na liście:"));
    out.push(...block.candidates.map((cand, i) => p(`${i + 1}. ${cand}`)));
  }

  if (isPackage && block.packagePositions) {
    out.push(summary(block.summaryParts));
    block.packagePositions.forEach((pos, i) => {
      out.push(new Paragraph({
        children: [new TextRun({ text: `${i + 1}. ${pos.label}`, bold: true, size: 20, font: FONT })],
        keepNext: true, spacing: { before: 120, after: 40 },
      }));
      out.push(summary([`ZA - ${pos.yes}`, `PRZECIW - ${pos.no}`, `WSTRZYMAŁO SIĘ - ${pos.abstain}`]));
      if (!block.secret && block.packageRows) {
        out.push(twoColumnMarks(block.packageRows.map((r) => ({ name: r.name, mark: r.marks[i] ?? "" }))));
      }
    });
    out.push(p("Wyniki poszczególnych pozycji", { bold: true }));
    out.push(packagePositionsTable(block.packagePositions));
  } else if (isList) {
    if (!block.secret && block.listVoterRows && block.listVoterRows.length > 0 && block.candidates) {
      out.push(gridTable(block.listVoterRows, block.candidates.length));
    }
    if (!block.secret && block.listNonVoterNames && block.listNonVoterNames.length > 0) {
      out.push(p("Niegłosujący", { bold: true }));
      out.push(nonVotersTable(block.listNonVoterNames));
    }
    out.push(p("Wynik głosowania", { bold: true }));
    out.push(summary(block.summaryParts));
    if (!block.secret && block.againstAllCount != null && block.againstAllCount > 0) {
      out.push(p(againstAllSentence(block.againstAllCount)));
    }
    if (block.listCandidates && block.listCandidates.length > 0) out.push(candidatesTable(block.listCandidates));
  } else if (!block.secret && block.standardRows && block.standardRows.length > 0) {
    out.push(twoColumnMarks(block.standardRows.map((r) => ({ name: r.name, mark: r.mark }))));
  }

  if (block.resolution) {
    out.push(p("Rozstrzygnięcie", { bold: true }));
    out.push(p(block.resolution));
  }

  return out;
}
