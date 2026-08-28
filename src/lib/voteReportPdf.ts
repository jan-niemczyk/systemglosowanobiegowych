/**
 * Renderer pdfmake dla ItemReportBlock (patrz voteReportData.ts) - wspólny blok
 * używany zarówno w samodzielnym raporcie głosowania, jak i osadzony w Protokole.
 * Cały blok pozycji jest "unbreakable" (nie łamie się między stronami).
 */
import type { ItemReportBlock } from "@/lib/voteReportData";

const FS = 9;

const BW_LINES = {
  hLineWidth: (i: number, node: { table: { body: unknown[] } }) => (i === 0 || i === node.table.body.length ? 0.8 : 0.4),
  vLineWidth: () => 0,
  hLineColor: () => "#000000",
  paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 2, paddingBottom: () => 2,
};

function summaryRow(parts: string[]): Record<string, unknown> {
  return { columns: parts.map((t) => ({ text: t, fontSize: FS, bold: true, width: "auto" })), columnGap: 18, margin: [0, 2, 0, 2] };
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function twoColumnMarks(rows: { name: string; mark: string }[]): Record<string, unknown> {
  const cells = rows.map((r) => ({
    columns: [{ text: r.name.toUpperCase(), fontSize: FS, width: "*" }, { text: r.mark, fontSize: FS, width: 26, alignment: "right" }],
    columnGap: 6, margin: [0, 0.6, 0, 0.6],
  }));
  const half = Math.ceil(cells.length / 2);
  return { columns: [{ stack: cells.slice(0, half), width: "*" }, { stack: cells.slice(half), width: "*" }], columnGap: 28, margin: [0, 2, 0, 6] };
}

function twoColumnPlainNames(names: string[]): Record<string, unknown> {
  const cells = names.map((n) => ({ text: n.toUpperCase(), fontSize: FS, margin: [0, 0.6, 0, 0.6] }));
  const half = Math.ceil(cells.length / 2);
  return { columns: [{ stack: cells.slice(0, half), width: "*" }, { stack: cells.slice(half), width: "*" }], columnGap: 28, margin: [0, 0, 0, 6] };
}

function packagePositionsTable(positions: { label: string; yes: number; no: number; abstain: number }[]): Record<string, unknown> {
  return {
    table: {
      headerRows: 1,
      widths: ["auto", "*", "auto", "auto", "auto"],
      body: [
        [{ text: "Nr", bold: true, fontSize: FS }, { text: "Pozycja", bold: true, fontSize: FS },
          { text: "Za", bold: true, fontSize: FS, alignment: "center" }, { text: "Przeciw", bold: true, fontSize: FS, alignment: "center" },
          { text: "Wstrzym.", bold: true, fontSize: FS, alignment: "center" }],
        ...positions.map((p, i) => [
          { text: String(i + 1), fontSize: FS }, { text: p.label, fontSize: FS },
          { text: String(p.yes), fontSize: FS, alignment: "center" }, { text: String(p.no), fontSize: FS, alignment: "center" },
          { text: String(p.abstain), fontSize: FS, alignment: "center" },
        ]),
      ],
    },
    layout: BW_LINES, margin: [0, 2, 0, 6],
  };
}

function candidatesTable(candidates: { label: string; yes: number }[]): Record<string, unknown> {
  const sorted = [...candidates].sort((a, b) => a.label.localeCompare(b.label, "pl"));
  return {
    table: {
      headerRows: 1, widths: ["*", "auto"],
      body: [
        [{ text: "Kandydat", bold: true, fontSize: FS }, { text: "Głosów", bold: true, fontSize: FS, alignment: "right" }],
        ...sorted.map((c) => [{ text: c.label, fontSize: FS }, { text: String(c.yes), fontSize: FS, alignment: "right" }]),
      ],
    },
    layout: BW_LINES, margin: [0, 2, 0, 6],
  };
}

function gridTable(header2: string, rows: { name: string; marks: string[] }[], nCols: number): Record<string, unknown>[] {
  const idxs = Array.from({ length: nCols }, (_, i) => i);
  return chunk(idxs, 15).map((cols) => ({
    table: {
      headerRows: 1,
      widths: ["auto", "*", ...cols.map(() => "auto")],
      body: [
        [{ text: "Lp.", bold: true, fontSize: FS }, { text: header2, bold: true, fontSize: FS }, ...cols.map((ci) => ({ text: String(ci + 1), bold: true, fontSize: FS, alignment: "center" }))],
        ...rows.map((r, idx) => [
          { text: String(idx + 1), fontSize: FS }, { text: r.name.toUpperCase(), fontSize: FS },
          ...cols.map((ci) => ({ text: r.marks[ci] ?? "", fontSize: FS, alignment: "center" })),
        ]),
      ],
    },
    layout: BW_LINES, margin: [0, 0, 0, 6],
  }));
}

export function itemReportPdfContent(block: ItemReportBlock): Record<string, unknown> {
  const content: Record<string, unknown>[] = [
    { text: `${block.order}. ${block.title}`, fontSize: FS + 2, bold: true, margin: [0, 4, 0, 2] },
    { text: block.typeVisibilityLine, fontSize: FS, color: "#555555", margin: [0, 0, 0, 4] },
    summaryRow(block.summaryParts),
  ];

  if (block.secret) {
    content.push({ text: "Głosowanie tajne - bez wykazu imiennego.", fontSize: FS, italics: true, margin: [0, 4, 0, 4] });
    if (block.packagePositions) content.push(packagePositionsTable(block.packagePositions));
    if (block.listCandidates) content.push(candidatesTable(block.listCandidates));
  } else {
    if (block.standardRows) content.push(twoColumnMarks(block.standardRows));
    if (block.packagePositions) content.push(packagePositionsTable(block.packagePositions));
    if (block.packageRows && block.packagePositions) content.push(...gridTable("Nazwisko i imię", block.packageRows, block.packagePositions.length));
    if (block.listCandidates) content.push(candidatesTable(block.listCandidates));
    if (block.listVoterRows && block.listVoterRows.length && block.listCandidates) {
      content.push(...gridTable("Nazwisko i imię", block.listVoterRows.map((r) => ({ name: r.name, marks: r.marks.map((m) => (m ? "za" : "")) })), block.listCandidates.length));
    }
    if (block.listNonVoterNames && block.listNonVoterNames.length) {
      content.push({ text: "Niegłosujący:", bold: true, fontSize: FS, margin: [0, 4, 0, 2] });
      content.push(twoColumnPlainNames(block.listNonVoterNames));
    }
  }

  return { stack: content, unbreakable: true, margin: [0, 0, 0, 10] };
}
