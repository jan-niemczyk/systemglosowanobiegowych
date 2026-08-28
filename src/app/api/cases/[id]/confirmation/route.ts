import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderPdf, pdfResponse } from "@/lib/pdf";
import { formatDateTime, CHOICE_LABEL } from "@/lib/labels";
import { NextResponse } from "next/server";

/**
 * GET /api/cases/[id]/confirmation - potwierdzenie udziału uczestnika w sprawie:
 * data i fakt oddania głosu; dla jawnych również wybór, dla tajnych bez treści głosu.
 * Operator może wskazać dowolnego uczestnika (?userId=), uczestnik wyłącznie siebie.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const requestedUserId = url.searchParams.get("userId");

  let userId: string;
  if (session.user.role === "OPERATOR" && requestedUserId) userId = requestedUserId;
  else userId = session.user.id;

  const participant = await prisma.caseParticipant.findUnique({ where: { caseId_userId: { caseId: id, userId } }, include: { user: true } });
  if (!participant) return new NextResponse("Not found", { status: 404 });
  if (session.user.role !== "OPERATOR" && userId !== session.user.id) return new NextResponse("Unauthorized", { status: 401 });

  const kase = await prisma.case.findUnique({
    where: { id },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!kase) return new NextResponse("Not found", { status: 404 });

  const rows: string[][] = [];
  for (const item of kase.items) {
    if (item.visibility === "SECRET") {
      const marker = await prisma.secretBallotMarker.findUnique({ where: { itemId_userId: { itemId: item.id, userId } } });
      rows.push([item.title, marker ? `Głos oddano ${formatDateTime(marker.castAt)}` : "Nie oddano głosu"]);
    } else {
      const ballot = await prisma.ballot.findUnique({ where: { itemId_userId: { itemId: item.id, userId } }, include: { selections: { include: { option: true } } } });
      if (!ballot) { rows.push([item.title, "Nie oddano głosu"]); continue; }
      let voteText: string;
      if (item.type === "STANDARD") voteText = ballot.choice ? CHOICE_LABEL[ballot.choice] : "-";
      else if (item.type === "PACKAGE") voteText = ballot.selections.map((s) => `${s.option.label}: ${s.choice ? CHOICE_LABEL[s.choice] : "-"}`).join("; ");
      else voteText = ballot.selections.map((s) => s.option.label).join(", ") || "(brak zaznaczeń)";
      rows.push([item.title, `${voteText} - oddano ${formatDateTime(ballot.castAt)}`]);
    }
  }

  const buffer = await renderPdf({
    pageMargins: [40, 40, 40, 40],
    content: [
      { text: "Potwierdzenie udziału w sprawie obiegowej", fontSize: 16, bold: true, margin: [0, 0, 0, 2] },
      { text: `${kase.number ? kase.number + " - " : ""}${kase.title}`, fontSize: 12, margin: [0, 0, 0, 8] },
      { text: `${participant.lastName} ${participant.firstName}`, fontSize: 11, margin: [0, 0, 0, 10] },
      { table: { widths: ["*", "*"], body: [["Pozycja", "Status głosu"], ...rows] }, layout: "lightHorizontalLines" },
      { text: `Wydruk wygenerowano: ${formatDateTime(new Date())}`, fontSize: 8, color: "#777", margin: [0, 20, 0, 0] },
    ],
  });
  return pdfResponse(`potwierdzenie-${id.slice(-8)}.pdf`, buffer);
}
