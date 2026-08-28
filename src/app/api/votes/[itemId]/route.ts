import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { closeCase, haveAllVoted } from "@/lib/closeCase";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CaseStatus, ItemStatus, VoteType, VoteVisibility, VoteChoice, CloseMode } from "@prisma/client";

const choiceEnum = z.enum(["YES", "NO", "ABSTAIN"]);

const bodySchema = z.union([
  z.object({ choice: choiceEnum }),
  z.object({ selections: z.array(z.object({ optionId: z.string(), choice: choiceEnum })).min(1) }),
  z.object({ optionIds: z.array(z.string()) }),
]);

/** POST /api/votes/[itemId] - oddanie lub zmiana głosu na pozycji. */
export async function POST(req: Request, ctx: { params: Promise<{ itemId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.role === "OPERATOR") return new NextResponse("Operator nie bierze udziału w głosowaniu", { status: 403 });
  const { itemId } = await ctx.params;
  const userId = session.user.id;

  const item = await prisma.votingItem.findUnique({ where: { id: itemId }, include: { case: true, options: true } });
  if (!item) return new NextResponse("Not found", { status: 404 });
  if (item.case.status !== CaseStatus.OPEN || item.status !== ItemStatus.OPEN) {
    return new NextResponse("Głosowanie nie jest otwarte", { status: 400 });
  }

  const participant = await prisma.caseParticipant.findUnique({ where: { caseId_userId: { caseId: item.caseId, userId } } });
  if (!participant || !participant.hasVotingRight) {
    return new NextResponse("Brak prawa głosu w tej sprawie", { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });

  if (item.visibility === VoteVisibility.SECRET) {
    const existingMarker = await prisma.secretBallotMarker.findUnique({ where: { itemId_userId: { itemId, userId } } });
    if (existingMarker) return new NextResponse("Głos tajny został już oddany i jest ostateczny", { status: 400 });
  } else {
    const existingBallot = await prisma.ballot.findUnique({ where: { itemId_userId: { itemId, userId } } });
    if (existingBallot && !item.case.allowVoteChange) {
      return new NextResponse("Zmiana głosu nie jest dozwolona w tej sprawie", { status: 400 });
    }
  }

  // ── STANDARD ──
  if (item.type === VoteType.STANDARD) {
    if (!("choice" in parsed.data)) return new NextResponse("Wymagane pole „choice”", { status: 400 });
    const { choice } = parsed.data;
    if (item.visibility === VoteVisibility.SECRET) {
      await prisma.$transaction([
        prisma.secretBallotMarker.create({ data: { itemId, userId } }),
        prisma.votingItem.update({
          where: { id: itemId },
          data: {
            secretYes: { increment: choice === "YES" ? 1 : 0 },
            secretNo: { increment: choice === "NO" ? 1 : 0 },
            secretAbstain: { increment: choice === "ABSTAIN" ? 1 : 0 },
          },
        }),
      ]);
    } else {
      await prisma.ballot.upsert({
        where: { itemId_userId: { itemId, userId } },
        create: { itemId, userId, choice: choice as VoteChoice, voterFirstName: participant.firstName, voterLastName: participant.lastName },
        update: { choice: choice as VoteChoice },
      });
    }
  }

  // ── PACKAGE ──
  else if (item.type === VoteType.PACKAGE) {
    if (!("selections" in parsed.data)) return new NextResponse("Wymagane pole „selections”", { status: 400 });
    const optionIds = new Set(item.options.map((o) => o.id));
    const sel = parsed.data.selections;
    if (sel.length !== item.options.length || !sel.every((s) => optionIds.has(s.optionId))) {
      return new NextResponse("Wymagany głos na wszystkie pozycje pakietu", { status: 400 });
    }
    if (item.visibility === VoteVisibility.SECRET) {
      await prisma.$transaction([
        prisma.secretBallotMarker.create({ data: { itemId, userId } }),
        ...sel.map((s) => prisma.voteOption.update({
          where: { id: s.optionId },
          data: {
            secretYes: { increment: s.choice === "YES" ? 1 : 0 },
            secretNo: { increment: s.choice === "NO" ? 1 : 0 },
            secretAbstain: { increment: s.choice === "ABSTAIN" ? 1 : 0 },
          },
        })),
      ]);
    } else {
      await prisma.ballot.upsert({
        where: { itemId_userId: { itemId, userId } },
        create: {
          itemId, userId, voterFirstName: participant.firstName, voterLastName: participant.lastName,
          selections: { create: sel.map((s) => ({ optionId: s.optionId, choice: s.choice as VoteChoice })) },
        },
        update: {
          selections: { deleteMany: {}, create: sel.map((s) => ({ optionId: s.optionId, choice: s.choice as VoteChoice })) },
        },
      });
    }
  }

  // ── LIST ──
  else if (item.type === VoteType.LIST) {
    if (!("optionIds" in parsed.data)) return new NextResponse("Wymagane pole „optionIds”", { status: 400 });
    const optionIds = new Set(item.options.map((o) => o.id));
    const chosen = parsed.data.optionIds;
    if (!chosen.every((oid) => optionIds.has(oid))) return new NextResponse("Nieznana opcja", { status: 400 });
    if (item.minSelections != null && chosen.length < item.minSelections) {
      return new NextResponse(`Wymagane co najmniej ${item.minSelections} zaznaczeń`, { status: 400 });
    }
    if (item.maxSelections != null && chosen.length > item.maxSelections) {
      return new NextResponse(`Dopuszczalne maksymalnie ${item.maxSelections} zaznaczeń`, { status: 400 });
    }
    if (item.visibility === VoteVisibility.SECRET) {
      await prisma.$transaction([
        prisma.secretBallotMarker.create({ data: { itemId, userId } }),
        ...chosen.map((oid) => prisma.voteOption.update({ where: { id: oid }, data: { secretYes: { increment: 1 } } })),
      ]);
    } else {
      await prisma.ballot.upsert({
        where: { itemId_userId: { itemId, userId } },
        create: {
          itemId, userId, voterFirstName: participant.firstName, voterLastName: participant.lastName,
          selections: { create: chosen.map((oid) => ({ optionId: oid })) },
        },
        update: {
          selections: { deleteMany: {}, create: chosen.map((oid) => ({ optionId: oid })) },
        },
      });
    }
  }

  if (item.case.closeMode === CloseMode.ALL_VOTED) {
    const allVoted = await haveAllVoted(item.caseId);
    if (allVoted) await closeCase(item.caseId, { reason: "wszyscy uprawnieni oddali głos" });
  }

  return NextResponse.json({ ok: true });
}
