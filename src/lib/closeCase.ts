import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { evaluateMajority } from "@/lib/majority";
import { computeListVoteResult, listVoteThreshold } from "@/lib/listVote";
import { VoteType, VoteVisibility, VoteChoice, ItemStatus, CaseStatus, ResultsVisibility } from "@prisma/client";

/**
 * Zamyka sprawę: liczy i utrwala wyniki wszystkich pozycji głosowania, zamyka
 * sprawę oraz - zgodnie z konfiguracją - publikuje wyniki automatycznie.
 * Wywoływana zarówno przez operatora (ręczne zamknięcie), automatykę
 * "po oddaniu głosów przez wszystkich", jak i harmonogram (upływ terminu).
 */
export async function closeCase(caseId: string, opts?: { closedByUserId?: string; reason?: string }) {
  const kase = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      participants: true,
      items: {
        include: {
          options: { orderBy: { order: "asc" } },
          ballots: { include: { selections: true } },
        },
      },
    },
  });
  if (!kase) throw new Error("Sprawa nie istnieje");
  if (kase.status !== CaseStatus.OPEN) return; // już zamknięta / anulowana - nic do zrobienia

  const eligibleCount = kase.participants.filter((p) => p.hasVotingRight).length;

  for (const item of kase.items) {
    if (item.type === VoteType.STANDARD) {
      let yes = 0, no = 0, abstain = 0, castCount = 0;
      if (item.visibility === VoteVisibility.SECRET) {
        yes = item.secretYes; no = item.secretNo; abstain = item.secretAbstain;
        castCount = yes + no + abstain;
      } else {
        for (const b of item.ballots) {
          if (b.choice === VoteChoice.YES) yes++;
          else if (b.choice === VoteChoice.NO) no++;
          else if (b.choice === VoteChoice.ABSTAIN) abstain++;
        }
        castCount = item.ballots.length;
      }
      const result = evaluateMajority(item.majorityKind, item.majorityBase, { yes, no, abstain, eligibleCount });
      await prisma.votingItem.update({
        where: { id: item.id },
        data: {
          status: ItemStatus.CLOSED,
          resultEligibleCount: eligibleCount,
          resultCastCount: castCount,
          resultYes: yes, resultNo: no, resultAbstain: abstain,
          resultPassed: result.passed,
        },
      });
    } else if (item.type === VoteType.PACKAGE) {
      const castCount = item.visibility === VoteVisibility.SECRET
        ? await prisma.secretBallotMarker.count({ where: { itemId: item.id } })
        : item.ballots.length;
      for (const opt of item.options) {
        let yes = 0, no = 0, abstain = 0;
        if (item.visibility === VoteVisibility.SECRET) {
          yes = opt.secretYes; no = opt.secretNo; abstain = opt.secretAbstain;
        } else {
          for (const b of item.ballots) {
            const sel = b.selections.find((s) => s.optionId === opt.id);
            if (sel?.choice === VoteChoice.YES) yes++;
            else if (sel?.choice === VoteChoice.NO) no++;
            else if (sel?.choice === VoteChoice.ABSTAIN) abstain++;
          }
        }
        const result = evaluateMajority(item.majorityKind, item.majorityBase, { yes, no, abstain, eligibleCount });
        await prisma.voteOption.update({
          where: { id: opt.id },
          data: { resultYes: yes, resultNo: no, resultAbstain: abstain, resultPassed: result.passed },
        });
      }
      await prisma.votingItem.update({
        where: { id: item.id },
        data: { status: ItemStatus.CLOSED, resultEligibleCount: eligibleCount, resultCastCount: castCount },
      });
    } else if (item.type === VoteType.LIST) {
      if (item.visibility === VoteVisibility.SECRET) {
        const voterCount = await prisma.secretBallotMarker.count({ where: { itemId: item.id } });
        const { threshold } = listVoteThreshold(item.majorityKind, item.majorityBase, voterCount, eligibleCount);
        // Dla tajnej listy liczymy "za" wprost z secretYes każdej opcji, a "przeciw" jako dopełnienie do voterCount.
        for (const opt of item.options) {
          const yes = opt.secretYes;
          const no = Math.max(voterCount - yes, 0);
          await prisma.voteOption.update({
            where: { id: opt.id },
            data: { resultYes: yes, resultNo: no, resultAbstain: 0, resultPassed: yes >= threshold && voterCount > 0 },
          });
        }
        await prisma.votingItem.update({
          where: { id: item.id },
          data: { status: ItemStatus.CLOSED, resultEligibleCount: eligibleCount, resultCastCount: voterCount },
        });
      } else {
        const result = computeListVoteResult({
          options: item.options.map((o) => ({ id: o.id, order: o.order, label: o.label })),
          ballots: item.ballots.map((b) => ({ id: b.id, userId: b.userId, selectedOptionIds: b.selections.map((s) => s.optionId) })),
          majorityKind: item.majorityKind, majorityBase: item.majorityBase, eligibleCount,
        });
        for (const o of result.options) {
          await prisma.voteOption.update({
            where: { id: o.optionId },
            data: { resultYes: o.yesCount, resultNo: o.noCount, resultAbstain: 0, resultPassed: o.passed },
          });
        }
        await prisma.votingItem.update({
          where: { id: item.id },
          data: { status: ItemStatus.CLOSED, resultEligibleCount: eligibleCount, resultCastCount: result.voterCount },
        });
      }
    }
  }

  const now = new Date();
  const autoPublish = kase.resultsVisibility === ResultsVisibility.AUTO_ON_CLOSE;
  await prisma.case.update({
    where: { id: caseId },
    data: {
      status: autoPublish ? CaseStatus.RESULTS_PUBLISHED : CaseStatus.CLOSED,
      closedAt: now,
      resultsPublishedAt: autoPublish ? now : null,
    },
  });

  await audit({
    action: "CASE_CLOSED",
    description: opts?.reason ? `Sprawa zamknięta (${opts.reason})` : "Sprawa zamknięta",
    caseId, userId: opts?.closedByUserId,
  });
  if (autoPublish) {
    await audit({ action: "RESULTS_PUBLISHED", description: "Wyniki opublikowane automatycznie po zamknięciu", caseId, userId: opts?.closedByUserId });
  }
}

/** Czy wszyscy uprawnieni oddali głos na wszystkich otwartych pozycjach sprawy. */
export async function haveAllVoted(caseId: string): Promise<boolean> {
  const kase = await prisma.case.findUnique({
    where: { id: caseId },
    include: { participants: { where: { hasVotingRight: true } }, items: { where: { status: ItemStatus.OPEN } } },
  });
  if (!kase || kase.items.length === 0) return false;
  const eligibleIds = kase.participants.map((p) => p.userId);
  if (eligibleIds.length === 0) return false;

  for (const item of kase.items) {
    const votedIds = item.visibility === VoteVisibility.SECRET
      ? (await prisma.secretBallotMarker.findMany({ where: { itemId: item.id }, select: { userId: true } })).map((m) => m.userId)
      : (await prisma.ballot.findMany({ where: { itemId: item.id }, select: { userId: true } })).map((b) => b.userId);
    const votedSet = new Set(votedIds);
    if (!eligibleIds.every((id) => votedSet.has(id))) return false;
  }
  return true;
}
