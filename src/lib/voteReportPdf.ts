/**
 * Renderer pdfmake dla ItemReportBlock (patrz voteReportData.ts) - PORT 1:1 układu z
 * iOBRAD (`git show 2db16cc:src/lib/generatePdf.ts`, funkcja `reportContent`; kopia w
 * scratchpadzie). Odpowiada wariantowi iOBRAD z wyłączonymi klubami i bez pojęcia obecności
 * (patrz komentarz w voteReportData.ts) - stąd brak `groupHead`, `NIEOBECNI` i znaczników
 * nb./ob./wykl. Dla głosowań tajnych - per wyraźną decyzję - żadne listy imienne się nie
 * pojawiają (dane liczbowe jak w oryginale, ale bez per-osobowej ekspozycji).
 *
 * `standalone: true` (samodzielny "Raport głosowania") dokłada nagłówek dokumentu
 * (organ / sprawa / "Głosowanie nr Y (znacznik czasu)"); `standalone: false`
 * (osadzone w Protokole) pomija go - nagłówek sprawy jest tam wypisany raz, na górze.
 */
import type { ItemReportBlock } from "@/lib/voteReportData";
import { formatDateTimeSeconds } from "@/lib/labels";

const FS = 9;

// Czarno-białe, cienkie linie poziome między wierszami (zamiast szarych domyślnych).
// Eksportowane - używane też w innych wydrukach (np. potwierdzenie oddania głosu),
// żeby zachować tę samą stylistykę tabel w całej rodzinie wydruków.
export const BW_LINES = {
  hLineWidth: (i: number, node: { table: { body: unknown[] } }) => (i === 0 || i === node.table.body.length ? 0.8 : 0.4),
  vLineWidth: () => 0,
  hLineColor: () => "#000000",
  paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 2, paddingBottom: () => 2,
};

function summaryRow(parts: string[]): Record<string, unknown> {
  return {
    columns: parts.map((t) => ({ text: t, fontSize: FS, bold: true, width: "auto" })),
    columnGap: 18,
    margin: [0, 4, 0, 10],
  };
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// Dwie kolumny: NAZWISKO Imię (lewa, szeroka) + znacznik (prawa, wyrównany do prawej).
// markWidth/margin: 26 / [0,0,0,6] dla zwykłych głosowań, 30 / [0,2,0,8] dla pakietu (jak w oryginale).
function twoColumnMarks(rows: { name: string; mark: string }[], markWidth = 26, margin: number[] = [0, 0, 0, 6]): Record<string, unknown> {
  const cells = rows.map((r) => ({
    columns: [
      { text: r.name, fontSize: FS, width: "*" },
      { text: r.mark, fontSize: FS, width: markWidth, alignment: "right" },
    ],
    columnGap: 6,
    margin: [0, 0.6, 0, 0.6],
  }));
  const half = Math.ceil(cells.length / 2);
  return {
    columns: [{ stack: cells.slice(0, half), width: "*" }, { stack: cells.slice(half), width: "*" }],
    columnGap: 28,
    margin,
  };
}

// Tabela Lp. | Nazwisko i imię | 1..N (kandydaci/pozycje w kolejności), dzielona po 15 kolumn.
function gridTable(rows: { name: string; marks: string[] }[], nCols: number): Record<string, unknown>[] {
  const colIndexes = Array.from({ length: nCols }, (_, i) => i);
  const out: Record<string, unknown>[] = [];
  for (const colChunk of chunk(colIndexes, 15)) {
    const header = [
      { text: "Lp.", fontSize: FS, bold: true },
      { text: "Nazwisko i imię", fontSize: FS, bold: true },
      ...colChunk.map((ci) => ({ text: String(ci + 1), fontSize: FS, bold: true, alignment: "center" })),
    ];
    const body = rows.map((r, idx) => [
      { text: String(idx + 1), fontSize: FS },
      { text: r.name, fontSize: FS },
      ...colChunk.map((ci) => ({ text: r.marks[ci] ?? "", fontSize: FS, alignment: "center" })),
    ]);
    out.push({
      table: { headerRows: 1, widths: ["auto", "*", ...colChunk.map(() => "auto")], body: [header, ...body] },
      layout: BW_LINES,
      margin: [0, 0, 0, 6],
    });
  }
  return out;
}

// "Niegłosujący": 1-3 tabele Lp. | Nazwisko i imię | ng. obok siebie, zależnie od liczby osób.
function nonVotersTables(names: string[]): Record<string, unknown> {
  const perCol = names.length <= 12 ? names.length : Math.ceil(names.length / (names.length <= 30 ? 2 : 3));
  const colChunks = chunk(names, perCol || 1);
  let lp = 1;
  const cols = colChunks.map((ch) => {
    const startLp = lp;
    lp += ch.length;
    return {
      table: {
        headerRows: 1,
        widths: ["auto", "*", "auto"],
        body: [
          [{ text: "Lp.", fontSize: FS, bold: true }, { text: "Nazwisko i imię", fontSize: FS, bold: true }, { text: "", fontSize: FS, bold: true }],
          ...ch.map((n, i) => [{ text: String(startLp + i), fontSize: FS }, { text: n, fontSize: FS }, { text: "ng.", fontSize: FS, alignment: "center" }]),
        ],
      },
      layout: BW_LINES,
      width: "*",
    };
  });
  return { columns: cols, columnGap: 12, margin: [0, 0, 0, 8] };
}

function packagePositionsTable(positions: { label: string; yes: number; no: number; abstain: number }[]): Record<string, unknown> {
  const header = [
    { text: "Nr", fontSize: FS, bold: true },
    { text: "Pozycja", fontSize: FS, bold: true },
    { text: "Za", fontSize: FS, bold: true, alignment: "center" },
    { text: "Przeciw", fontSize: FS, bold: true, alignment: "center" },
    { text: "Wstrzym.", fontSize: FS, bold: true, alignment: "center" },
  ];
  const rows = positions.map((p, i) => [
    { text: String(i + 1), fontSize: FS },
    { text: p.label, fontSize: FS },
    { text: String(p.yes), fontSize: FS, alignment: "center" },
    { text: String(p.no), fontSize: FS, alignment: "center" },
    { text: String(p.abstain), fontSize: FS, alignment: "center" },
  ]);
  return { table: { headerRows: 1, widths: ["auto", "*", "auto", "auto", "auto"], body: [header, ...rows] }, layout: BW_LINES, margin: [0, 0, 0, 8] };
}

function candidatesTable(candidates: { label: string; yes: number }[]): Record<string, unknown> {
  const body = [
    [{ text: "Kandydat", fontSize: FS, bold: true }, { text: "Głosów", fontSize: FS, bold: true, alignment: "right" }],
    ...candidates.map((c) => [{ text: c.label, fontSize: FS }, { text: String(c.yes), fontSize: FS, alignment: "right" }]),
  ];
  return { table: { headerRows: 1, widths: ["*", "auto"], body }, layout: BW_LINES, margin: [0, 0, 0, 4] };
}

// Odmiana: 1 -> "osoba nie poparła"; 2-4 (poza 12-14) -> "osoby nie poparły"; reszta -> "osób nie poparło".
function againstAllSentence(n: number): string {
  const lastTwo = n % 100, last = n % 10;
  const isFew = last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
  const noun = n === 1 ? "osoba" : isFew ? "osoby" : "osób";
  const verb = n === 1 ? "nie poparła" : isFew ? "nie poparły" : "nie poparło";
  return `Żadnej kandydatury ${verb} ${n} ${noun}.`;
}

export function itemReportPdfContent(block: ItemReportBlock, opts: { standalone: boolean }): Record<string, unknown> {
  const c: Record<string, unknown>[] = [];
  const isList = block.candidates != null;
  const isPackage = block.packagePositions != null && block.candidates == null;

  if (opts.standalone) {
    const { caseInfo } = block;
    if (caseInfo.organizationName) c.push({ text: caseInfo.organizationName, fontSize: FS, margin: [0, 0, 0, 2] });
    if (caseInfo.caseTitle) c.push({ text: caseInfo.caseTitle, fontSize: FS, margin: [0, 0, 0, 4] });
    const ts = formatDateTimeSeconds(caseInfo.closedAt);
    const head = `Głosowanie nr ${block.order} (${ts})`;
    c.push({ text: head, fontSize: FS, bold: true, margin: [0, 0, 0, 8] });
  }

  if (block.secret) c.push({ text: "Głosowanie tajne", fontSize: FS, bold: true, margin: [0, 0, 0, 6] });

  c.push({ text: `${block.order}. ${block.title}`, fontSize: FS, margin: [0, 0, 0, 6] });
  if (block.description) c.push({ text: block.description, fontSize: FS, margin: [0, 0, 0, 6] });
  if (isList && block.candidatesCount) c.push({ text: `${block.candidatesCount} kandydatów`, fontSize: FS, margin: [0, 0, 0, 6] });

  if (!isPackage) c.push(summaryRow(block.summaryParts));

  if (isList && block.candidates && block.candidates.length > 0) {
    c.push({ text: "Kandydaci według kolejności na liście:", fontSize: FS, margin: [0, 2, 0, 3] });
    const cols = 3;
    const perCol = Math.ceil(block.candidates.length / cols);
    const columns = chunk(block.candidates.map((cand, i) => `${i + 1}. ${cand}`), perCol)
      .map((col) => ({ stack: col.map((t) => ({ text: t, fontSize: FS, margin: [0, 0.5, 0, 0.5] })), width: "*" }));
    c.push({ columns, columnGap: 16, margin: [0, 0, 0, 8] });
  }

  if (isPackage && block.packagePositions) {
    c.push(summaryRow(block.summaryParts));
    c.push({ text: "", margin: [0, 0, 0, 4] });
    // Jak w iOBRADACH: blok pozycji trzymamy razem tylko przy niewielkiej liczbie uprawnionych -
    // przy dużej liczbie unbreakable gubiłoby treść (patrz komentarz w oryginale), więc elementy
    // wypychamy płasko i pozwalamy na naturalne łamanie.
    const smallEnough = block.eligibleCount <= 40;
    block.packagePositions.forEach((pos, i) => {
      const head: Record<string, unknown>[] = [
        { text: `${i + 1}. ${pos.label}`, fontSize: FS, bold: true, margin: [0, 4, 0, 2] },
        summaryRow([`ZA - ${pos.yes}`, `PRZECIW - ${pos.no}`, `WSTRZYMAŁO SIĘ - ${pos.abstain}`]),
      ];
      const body: Record<string, unknown>[] = [];
      if (!block.secret && block.packageRows) {
        body.push(twoColumnMarks(block.packageRows.map((r) => ({ name: r.name, mark: r.marks[i] ?? "" })), 30, [0, 2, 0, 8]));
      }
      if (smallEnough) c.push({ stack: [...head, ...body], unbreakable: true });
      else { for (const h of head) c.push(h); for (const b of body) c.push(b); }
    });
    c.push({ text: "Wyniki poszczególnych pozycji", fontSize: FS, bold: true, margin: [0, 6, 0, 4] });
    c.push(packagePositionsTable(block.packagePositions));
  } else if (isList) {
    if (!block.secret && block.listVoterRows && block.listVoterRows.length > 0 && block.candidates) {
      c.push(...gridTable(block.listVoterRows, block.candidates.length));
    }
    if (!block.secret && block.listNonVoterNames && block.listNonVoterNames.length > 0) {
      c.push({ text: "Niegłosujący", fontSize: FS, bold: true, margin: [0, 8, 0, 3] });
      c.push(nonVotersTables(block.listNonVoterNames));
    }
    c.push({ text: "Wynik głosowania", fontSize: FS, bold: true, margin: [0, 6, 0, 3] });
    c.push(summaryRow(block.summaryParts));
    if (!block.secret && block.againstAllCount != null && block.againstAllCount > 0) {
      c.push({ text: againstAllSentence(block.againstAllCount), fontSize: FS, margin: [0, 4, 0, 2] });
    }
    if (block.listCandidates && block.listCandidates.length > 0) c.push(candidatesTable(block.listCandidates));
  } else if (!block.secret && block.standardRows && block.standardRows.length > 0) {
    c.push(twoColumnMarks(block.standardRows.map((r) => ({ name: r.name, mark: r.mark }))));
  }

  return { stack: c, margin: [0, 0, 0, 10] };
}
