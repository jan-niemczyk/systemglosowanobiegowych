/**
 * Dane do jednego, spójnego wydruku pozycji głosowania (PDF raportu głosowania
 * i - osadzone - w Protokole), wzorowane na raportach iOBRAD: pogrubiona linia
 * podsumy (GŁOSOWAŁO/ZA/PRZECIW/WSTRZYMAŁO SIĘ/NIE GŁOSOWAŁO) i wykaz imienny.
 * Zaadaptowane do uproszczonego modelu (bez klubów, bez obecności, bez reguł
 * większości) - wyłącznie zliczenie głosów, żadnego automatycznego rozstrzygania.
 */
import type { VoteChoice, VoteType, VoteVisibility } from "@prisma/client";
import { VOTE_TYPE_LABEL, VOTE_VISIBILITY_LABEL } from "@/lib/labels";
import { comparePl } from "@/lib/sortPl";

const MARK: Record<VoteChoice, string> = { YES: "za", NO: "pr.", ABSTAIN: "ws." };
const NOT_VOTED_MARK = "ng.";

export interface ReportItemInput {
  order: number;
  title: string;
  type: VoteType;
  visibility: VoteVisibility;
  resultEligibleCount: number | null;
  resultCastCount: number | null;
  resultYes: number | null;
  resultNo: number | null;
  resultAbstain: number | null;
  options: { id: string; label: string; resultYes: number | null; resultNo: number | null; resultAbstain: number | null }[];
  ballots: { userId: string | null; voterFirstName: string | null; voterLastName: string | null; choice: VoteChoice | null; selections: { optionId: string; choice: VoteChoice | null }[] }[];
}
export interface ReportParticipant { userId: string; firstName: string; lastName: string }

export interface ItemReportBlock {
  order: number;
  title: string;
  typeVisibilityLine: string;
  secret: boolean;
  /** Pogrubiona linia podsumy, np. ["GŁOSOWAŁO - 12", "ZA - 8", ...]. */
  summaryParts: string[];
  /** STANDARD, jawne: wszyscy uprawnieni z oznaczeniem (za/pr./ws./ng.). */
  standardRows?: { name: string; mark: string }[];
  /** PACKAGE: podsuma per pozycja. */
  packagePositions?: { label: string; yes: number; no: number; abstain: number }[];
  /** PACKAGE, jawne: wszyscy uprawnieni x pozycje. */
  packageRows?: { name: string; marks: string[] }[];
  /** LIST: podsuma per kandydat. */
  listCandidates?: { label: string; yes: number }[];
  /** LIST, jawne: wyłącznie głosujący x kandydaci ("za" / puste). */
  listVoterRows?: { name: string; marks: boolean[] }[];
  /** LIST, jawne: niegłosujący (osobna lista). */
  listNonVoterNames?: string[];
}

function fullName(last: string | null, first: string | null): string {
  return `${last ?? ""} ${first ?? ""}`.trim();
}

export function buildItemReport(item: ReportItemInput, participants: ReportParticipant[]): ItemReportBlock {
  const secret = item.visibility === "SECRET";
  const eligible = item.resultEligibleCount ?? participants.length;
  const cast = item.resultCastCount ?? 0;
  const notVoted = Math.max(eligible - cast, 0);

  const block: ItemReportBlock = {
    order: item.order,
    title: item.title,
    typeVisibilityLine: `${VOTE_TYPE_LABEL[item.type]} ${VOTE_VISIBILITY_LABEL[item.visibility]}`,
    secret,
    summaryParts: [],
  };

  const sortedParticipants = [...participants].sort((a, b) => comparePl(a.lastName, b.lastName) || comparePl(a.firstName, b.firstName));

  if (item.type === "STANDARD") {
    block.summaryParts = [
      `GŁOSOWAŁO - ${cast}`,
      `ZA - ${item.resultYes ?? 0}`,
      `PRZECIW - ${item.resultNo ?? 0}`,
      `WSTRZYMAŁO SIĘ - ${item.resultAbstain ?? 0}`,
      `NIE GŁOSOWAŁO - ${notVoted}`,
    ];
    if (!secret) {
      const byUser = new Map(item.ballots.map((b) => [b.userId, b.choice]));
      block.standardRows = sortedParticipants.map((p) => {
        const choice = byUser.get(p.userId);
        return { name: fullName(p.lastName, p.firstName), mark: choice ? MARK[choice] : NOT_VOTED_MARK };
      });
    }
  } else if (item.type === "PACKAGE") {
    block.summaryParts = [`GŁOSOWAŁO - ${cast}`, `NIE GŁOSOWAŁO - ${notVoted}`];
    block.packagePositions = item.options.map((o) => ({ label: o.label, yes: o.resultYes ?? 0, no: o.resultNo ?? 0, abstain: o.resultAbstain ?? 0 }));
    if (!secret) {
      const byUser = new Map(item.ballots.map((b) => [b.userId, b]));
      block.packageRows = sortedParticipants.map((p) => {
        const ballot = byUser.get(p.userId);
        const marks = item.options.map((o) => {
          if (!ballot) return NOT_VOTED_MARK;
          const sel = ballot.selections.find((s) => s.optionId === o.id);
          return sel?.choice ? MARK[sel.choice] : NOT_VOTED_MARK;
        });
        return { name: fullName(p.lastName, p.firstName), marks };
      });
    }
  } else if (item.type === "LIST") {
    block.summaryParts = [`GŁOSOWAŁO - ${cast}`, `NIE GŁOSOWAŁO - ${notVoted}`];
    block.listCandidates = item.options.map((o) => ({ label: o.label, yes: o.resultYes ?? 0 }));
    if (!secret) {
      const voterIds = new Set(item.ballots.map((b) => b.userId));
      const voters = sortedParticipants.filter((p) => voterIds.has(p.userId));
      const byUser = new Map(item.ballots.map((b) => [b.userId, b]));
      block.listVoterRows = voters.map((p) => {
        const ballot = byUser.get(p.userId);
        const selected = new Set((ballot?.selections ?? []).map((s) => s.optionId));
        return { name: fullName(p.lastName, p.firstName), marks: item.options.map((o) => selected.has(o.id)) };
      });
      block.listNonVoterNames = sortedParticipants.filter((p) => !voterIds.has(p.userId)).map((p) => fullName(p.lastName, p.firstName));
    }
  }

  return block;
}
