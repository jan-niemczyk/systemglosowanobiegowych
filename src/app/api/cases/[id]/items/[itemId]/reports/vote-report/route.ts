import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderPdf, pdfResponse } from "@/lib/pdf";
import { toCsv, csvResponse } from "@/lib/csv";
import { formatDateTime, VOTE_TYPE_LABEL, VOTE_VISIBILITY_LABEL } from "@/lib/labels";
import { formatMajority } from "@/lib/majority";
import { NextResponse } from "next/server";

export async function GET(req: Request, ctx: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { itemId } = await ctx.params;
  const format = new URL(req.url).searchParams.get("format");

  const item = await prisma.votingItem.findUnique({
    where: { id: itemId },
    include: { case: true, options: { orderBy: { order: "asc" } } },
  });
  if (!item) return new NextResponse("Not found", { status: 404 });

  if (format === "csv") {
    const rows: (string | number)[][] = [["Pozycja", item.title], ["Typ", VOTE_TYPE_LABEL[item.type]], ["Jawność", VOTE_VISIBILITY_LABEL[item.visibility]], []];
    if (item.type === "STANDARD") {
      rows.push(["Uprawnionych", item.resultEligibleCount ?? 0], ["Oddano głosów", item.resultCastCount ?? 0]);
      rows.push(["ZA", item.resultYes ?? 0], ["PRZECIW", item.resultNo ?? 0], ["WSTRZYMAŁO SIĘ", item.resultAbstain ?? 0]);
      rows.push(["Rozstrzygnięcie", item.resultPassed ? "PRZYJĘTO" : "ODRZUCONO"]);
    } else {
      rows.push(["Pozycja", "ZA", "PRZECIW", "Rozstrzygnięcie"]);
      for (const o of item.options) rows.push([o.label, o.resultYes ?? 0, o.resultNo ?? 0, o.resultPassed ? "PRZYJĘTO" : "ODRZUCONO"]);
    }
    return csvResponse(`raport-glosowania-${itemId.slice(-8)}.csv`, toCsv(rows));
  }

  const content: unknown[] = [
    { text: "Raport głosowania", fontSize: 16, bold: true, margin: [0, 0, 0, 2] },
    { text: `${item.case.number ? item.case.number + " - " : ""}${item.case.title}`, fontSize: 10, color: "#555", margin: [0, 0, 0, 8] },
    { text: `${item.order}. ${item.title}`, fontSize: 13, margin: [0, 0, 0, 4] },
    { text: `${VOTE_TYPE_LABEL[item.type]} · ${VOTE_VISIBILITY_LABEL[item.visibility]} · ${formatMajority(item.majorityKind, item.majorityBase)}`, fontSize: 9, color: "#555", margin: [0, 0, 0, 10] },
  ];

  if (item.status !== "CLOSED") {
    content.push({ text: "Głosowanie jeszcze nie zostało zamknięte - wyniki nie są dostępne.", fontSize: 10, italics: true });
  } else {
    content.push({
      table: { widths: ["auto", "*"], body: [["Uprawnionych", String(item.resultEligibleCount ?? "-")], ["Oddano głosów", String(item.resultCastCount ?? "-")]] },
      layout: "lightHorizontalLines", margin: [0, 0, 0, 10],
    });
    if (item.type === "STANDARD") {
      content.push({
        text: `ZA: ${item.resultYes ?? 0}   PRZECIW: ${item.resultNo ?? 0}   WSTRZYMAŁO SIĘ: ${item.resultAbstain ?? 0}`,
        fontSize: 12, margin: [0, 0, 0, 6],
      });
      content.push({ text: item.resultPassed ? "ROZSTRZYGNIĘCIE: PRZYJĘTO" : "ROZSTRZYGNIĘCIE: ODRZUCONO", fontSize: 12, bold: true });
    } else {
      content.push({
        table: {
          widths: ["*", "auto", "auto", "auto"],
          body: [["Pozycja", "ZA", "PRZECIW", "Rozstrzygnięcie"], ...item.options.map((o) => [o.label, String(o.resultYes ?? 0), String(o.resultNo ?? 0), o.resultPassed ? "PRZYJĘTO" : "ODRZUCONO"])],
        },
        layout: "lightHorizontalLines",
      });
    }
  }

  content.push({ text: `Wydruk wygenerowano: ${formatDateTime(new Date())}`, fontSize: 8, color: "#777", margin: [0, 20, 0, 0] });

  const buffer = await renderPdf({ content, pageMargins: [40, 40, 40, 40] });
  return pdfResponse(`raport-glosowania-${itemId.slice(-8)}.pdf`, buffer);
}
