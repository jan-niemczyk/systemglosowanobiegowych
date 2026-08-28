import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } from "docx";
import { formatDateTime, CHOICE_LABEL } from "@/lib/labels";
import { formatMajority } from "@/lib/majority";
import type { Case, VotingItem, VoteOption, Ballot, BallotSelection } from "@prisma/client";

type FullBallot = Ballot & { selections: (BallotSelection & { option: VoteOption })[] };
type FullItem = VotingItem & { options: VoteOption[]; ballots: FullBallot[] };
type FullCase = Case & { items: FullItem[]; body: { name: string } | null };

const FONT = "Arial";

function p(text: string, opts: { bold?: boolean; size?: number; italics?: boolean } = {}) {
  return new Paragraph({ children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size ?? 22, font: FONT })], spacing: { after: 120 } });
}

/** Generuje protokół sprawy w formacie DOCX (sekcja 9.1): numerowana sprawa, wyniki imienne, rozstrzygnięcie. */
export async function generateProtocolDocx(kase: FullCase, organizationName: string): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: organizationName, heading: HeadingLevel.HEADING_3, run: { font: FONT }, spacing: { after: 80 } }),
    new Paragraph({ text: "Protokół sprawy obiegowej", heading: HeadingLevel.HEADING_1, run: { font: FONT }, spacing: { after: 200 } }),
    p(`1. ${kase.number ? kase.number + " — " : ""}${kase.title}`, { bold: true, size: 26 }),
  ];

  if (kase.body) children.push(p(`Organ / zespół: ${kase.body.name}`, { size: 20 }));
  children.push(p(`Termin: otwarcie ${formatDateTime(kase.openedAt)} — zamknięcie ${formatDateTime(kase.closedAt)}`, { size: 20 }));
  if (kase.description) children.push(p(kase.description, { italics: true, size: 20 }));

  for (const item of kase.items) {
    children.push(new Paragraph({ text: item.title, heading: HeadingLevel.HEADING_2, run: { font: FONT }, spacing: { before: 200, after: 100 } }));
    children.push(p(formatMajority(item.majorityKind, item.majorityBase), { size: 20 }));

    if (item.type === "STANDARD") {
      children.push(p(`ZA: ${item.resultYes ?? 0}   PRZECIW: ${item.resultNo ?? 0}   WSTRZYMAŁO SIĘ: ${item.resultAbstain ?? 0}`, { size: 20 }));
    }

    // wyniki imienne (wyłącznie dla głosowań jawnych)
    if (item.visibility === "OPEN" && item.ballots.length > 0) {
      children.push(p("Wyniki imienne:", { bold: true, size: 20 }));
      const rows = [...item.ballots].sort((a, b) => (a.voterLastName ?? "").localeCompare(b.voterLastName ?? "", "pl"));
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [cell("Osoba", true), cell("Głos", true)] }),
          ...rows.map((b) => {
            const name = `${b.voterLastName ?? ""} ${b.voterFirstName ?? ""}`.trim();
            const vote = item.type === "STANDARD"
              ? (b.choice ? CHOICE_LABEL[b.choice] : "-")
              : item.type === "PACKAGE"
                ? b.selections.map((s) => `${s.option.label}: ${s.choice ? CHOICE_LABEL[s.choice] : "-"}`).join("; ")
                : (b.selections.map((s) => s.option.label).join(", ") || "(brak zaznaczeń)");
            return new TableRow({ children: [cell(name), cell(vote)] });
          }),
        ],
      });
      children.push(table);
      children.push(p(""));
    } else if (item.visibility === "SECRET") {
      children.push(p("Głosowanie tajne — bez wykazu imiennego.", { italics: true, size: 20 }));
    }

    if (item.type !== "STANDARD" && item.options.length > 0) {
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [cell("Pozycja", true), cell("ZA", true), cell("PRZECIW", true), cell("Rozstrzygnięcie", true)] }),
          ...item.options.map((o) => new TableRow({
            children: [cell(o.label), cell(String(o.resultYes ?? 0)), cell(String(o.resultNo ?? 0)), cell(o.resultPassed ? "PRZYJĘTO" : "ODRZUCONO")],
          })),
        ],
      });
      children.push(table);
      children.push(p(""));
    } else {
      children.push(p(`Rozstrzygnięcie: ${item.resultPassed ? "PRZYJĘTO" : "ODRZUCONO"}`, { bold: true, size: 22 }));
    }
  }

  children.push(new Paragraph({
    children: [new TextRun({ text: `Wydruk wygenerowano: ${formatDateTime(new Date())}`, size: 16, color: "777777", font: FONT })],
    alignment: AlignmentType.RIGHT,
    spacing: { before: 300 },
  }));

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}

function cell(text: string, header = false): TableCell {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text, bold: header, size: 20, font: FONT })] })],
  });
}
