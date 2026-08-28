import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderPdf, pdfResponse } from "@/lib/pdf";
import { formatDateTime, CHOICE_LABEL } from "@/lib/labels";
import { NextResponse } from "next/server";
import { comparePl } from "@/lib/sortPl";

/** GET .../roll-call - imienny wykaz głosów (wyłącznie dla głosowań jawnych). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { itemId } = await ctx.params;

  const item = await prisma.votingItem.findUnique({
    where: { id: itemId },
    include: {
      case: true,
      options: { orderBy: { order: "asc" } },
      ballots: { include: { selections: { include: { option: true } } } },
    },
  });
  if (!item) return new NextResponse("Not found", { status: 404 });
  if (item.visibility !== "OPEN") return new NextResponse("Imienny wykaz jest niedostępny dla głosowań tajnych", { status: 400 });

  const sorted = [...item.ballots].sort((a, b) => {
    const byLast = comparePl(a.voterLastName ?? "", b.voterLastName ?? "");
    return byLast !== 0 ? byLast : comparePl(a.voterFirstName ?? "", b.voterFirstName ?? "");
  });

  const rows = sorted.map((b) => {
    const name = `${b.voterLastName ?? ""} ${b.voterFirstName ?? ""}`.trim();
    let vote: string;
    if (item.type === "STANDARD") vote = b.choice ? CHOICE_LABEL[b.choice] : "-";
    else if (item.type === "PACKAGE") vote = b.selections.map((s) => `${s.option.label}: ${s.choice ? CHOICE_LABEL[s.choice] : "-"}`).join("; ");
    else vote = b.selections.map((s) => s.option.label).join(", ") || "(brak zaznaczeń)";
    return [name, vote];
  });

  const buffer = await renderPdf({
    pageMargins: [40, 40, 40, 40],
    content: [
      { text: "Imienny wykaz głosów", fontSize: 16, bold: true, margin: [0, 0, 0, 2] },
      { text: `${item.case.number ? item.case.number + " - " : ""}${item.case.title}`, fontSize: 10, color: "#555", margin: [0, 0, 0, 8] },
      { text: `${item.order}. ${item.title}`, fontSize: 13, margin: [0, 0, 0, 10] },
      {
        table: { widths: ["*", "*"], body: [["Osoba", "Głos"], ...rows] },
        layout: "lightHorizontalLines",
      },
      { text: `Wydruk wygenerowano: ${formatDateTime(new Date())}`, fontSize: 8, color: "#777", margin: [0, 20, 0, 0] },
    ],
  });
  return pdfResponse(`imienny-wykaz-${itemId.slice(-8)}.pdf`, buffer);
}
