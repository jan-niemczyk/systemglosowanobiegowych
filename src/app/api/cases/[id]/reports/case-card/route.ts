import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderPdf, pdfResponse } from "@/lib/pdf";
import { formatDateTime, CASE_STATUS_LABEL, VOTE_TYPE_LABEL, VOTE_VISIBILITY_LABEL, DOCUMENT_KIND_LABEL } from "@/lib/labels";
import { formatMajority } from "@/lib/majority";
import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const kase = await prisma.case.findUnique({
    where: { id },
    include: {
      body: true, operator: true,
      participants: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
      items: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } }, documents: { orderBy: { uploadedAt: "asc" } } },
      },
    },
  });
  if (!kase) return new NextResponse("Not found", { status: 404 });
  const settings = await prisma.settings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });

  const content: unknown[] = [
    { text: settings.organizationName, fontSize: 9, color: "#555" },
    { text: "Zbiorcza karta sprawy", fontSize: 16, bold: true, margin: [0, 4, 0, 2] },
    { text: `${kase.number ? kase.number + " - " : ""}${kase.title}`, fontSize: 13, margin: [0, 0, 0, 8] },
    {
      table: {
        widths: ["auto", "*"],
        body: [
          ["Status", CASE_STATUS_LABEL[kase.status]],
          ["Organ / zespół", kase.body?.name ?? "-"],
          ["Operator prowadzący", kase.operator ? `${kase.operator.firstName} ${kase.operator.lastName}` : "-"],
          ["Otwarto", formatDateTime(kase.openedAt)],
          ["Termin końcowy", formatDateTime(kase.deadlineAt)],
          ["Zamknięto", formatDateTime(kase.closedAt)],
          ["Wyniki opublikowano", formatDateTime(kase.resultsPublishedAt)],
        ],
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 12],
    },
  ];

  if (kase.description) content.push({ text: kase.description, fontSize: 10, margin: [0, 0, 0, 12] });

  content.push({ text: "Skład uprawnionych", fontSize: 12, bold: true, margin: [0, 8, 0, 4] });
  content.push({
    table: {
      widths: ["*", "auto"],
      body: [
        ["Osoba", "Prawo głosu"],
        ...kase.participants.map((p) => [`${p.lastName} ${p.firstName}`, p.hasVotingRight ? "tak" : "nie"]),
      ],
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 12],
  });

  content.push({ text: "Pozycje głosowania", fontSize: 12, bold: true, margin: [0, 8, 0, 4] });
  for (const item of kase.items) {
    content.push({ text: `${item.order}. ${item.title}`, fontSize: 11, bold: true, margin: [0, 6, 0, 2] });
    content.push({ text: `${VOTE_TYPE_LABEL[item.type]} · ${VOTE_VISIBILITY_LABEL[item.visibility]} · ${formatMajority(item.majorityKind, item.majorityBase)}`, fontSize: 9, color: "#555" });
    if (item.documents.length > 0) {
      content.push({
        text: `Dokumenty: ${item.documents.map((d) => `${d.fileName} (${DOCUMENT_KIND_LABEL[d.kind]})`).join(", ")}`,
        fontSize: 9, color: "#555", margin: [0, 2, 0, 0],
      });
    }
    if (item.status === "CLOSED") {
      content.push({
        text: `Uprawnionych: ${item.resultEligibleCount ?? "-"}  ·  Oddano głosów: ${item.resultCastCount ?? "-"}`,
        fontSize: 9, margin: [0, 2, 0, 0],
      });
      if (item.type === "STANDARD") {
        content.push({
          text: `ZA: ${item.resultYes ?? 0}   PRZECIW: ${item.resultNo ?? 0}   WSTRZYMAŁO SIĘ: ${item.resultAbstain ?? 0}   -   ${item.resultPassed ? "PRZYJĘTO" : "ODRZUCONO"}`,
          fontSize: 10, bold: true, margin: [0, 2, 0, 4],
        });
      } else {
        content.push({
          table: {
            widths: ["*", "auto", "auto", "auto"],
            body: [
              ["Pozycja", "ZA", "PRZECIW", "Rozstrzygnięcie"],
              ...item.options.map((o) => [o.label, String(o.resultYes ?? 0), String(o.resultNo ?? 0), o.resultPassed ? "PRZYJĘTO" : "ODRZUCONO"]),
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 2, 0, 4],
        });
      }
    } else {
      content.push({ text: "Głosowanie jeszcze nie zostało zamknięte.", fontSize: 9, italics: true, margin: [0, 2, 0, 4] });
    }
  }

  content.push({
    text: `Wydruk wygenerowano: ${formatDateTime(new Date())}`,
    fontSize: 8, color: "#777", margin: [0, 16, 0, 0],
  });

  const buffer = await renderPdf({ content, pageMargins: [40, 40, 40, 40] });
  return pdfResponse(`karta-sprawy-${kase.id.slice(-8)}.pdf`, buffer);
}
