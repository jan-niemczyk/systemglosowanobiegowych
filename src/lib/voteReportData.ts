/**
 * Dane do raportu jednej pozycji głosowania - PORT układu iOBRAD (patrz
 * `git show 2db16cc:src/lib/generatePdf.ts` + `reportTypes.ts` + `voteReportData.ts`,
 * kopie w scratchpadzie). Model asynchroniczny odpowiada wariantowi iOBRAD z wyłączonymi
 * klubami (`groupsEnabled = false`, `mergeToSingleGroup`) i bez pojęcia obecności - każdy
 * uprawniony jest "obecny", więc znaczniki nb./ob./wykl. i NIEOBECNI nie występują, tak samo
 * jak kworum i reguły większości (usunięte z całej aplikacji). Poza tym układ, kolejność
 * sekcji i brzmienie nagłówków są przeniesione 1:1 - patrz voteReportPdf.ts.
 */
import type { VoteChoice, VoteType, VoteVisibility } from "@prisma/client";
import { comparePl } from "@/lib/sortPl";

const MARK: Record<VoteChoice, string> = { YES: "za", NO: "pr.", ABSTAIN: "ws." };
const NOT_VOTED_MARK = "ng.";
// Ranga sortowania dla zwykłych głosowań: za -> pr. -> ws. -> ng. (jak w iOBRADACH).
const STANDARD_RANK: Record<string, number> = { za: 1, "pr.": 2, "ws.": 3, "ng.": 4 };

export interface ReportItemInput {
  order: number;
  title: string;
  description: string | null;
  type: VoteType;
  visibility: VoteVisibility;
  resultEligibleCount: number | null;
  resultCastCount: number | null;
  resultYes: number | null;
  resultNo: number | null;
  resultAbstain: number | null;
  resolution: string | null;
  options: { id: string; label: string; resultYes: number | null; resultNo: number | null; resultAbstain: number | null }[];
  ballots: { userId: string | null; voterFirstName: string | null; voterLastName: string | null; choice: VoteChoice | null; selections: { optionId: string; choice: VoteChoice | null }[] }[];
}
export interface ReportParticipant { userId: string; firstName: string; lastName: string }

/** Nagłówek raportu - nazwa organu i sprawy, tak jak organizacja/posiedzenie w iOBRADACH. */
export interface ReportCaseInfo {
  organizationName: string;
  caseTitle: string;
  caseNumber: string | null;
  /** Czas zamknięcia sprawy (wszystkie pozycje zamykają się razem z nią) - z sekundami. */
  closedAt: Date | null;
}

export interface ItemReportBlock {
  order: number;
  title: string;
  description: string | null;
  secret: boolean;
  caseInfo: ReportCaseInfo;
  /** Liczba uprawnionych - używana do progu łamania stron bloku pakietu (jak w iOBRADACH). */
  eligibleCount: number;
  /** Pogrubiona linia podsumy, np. ["GŁOSOWAŁO - 12", "ZA - 8", ...]. Pakiet jej nie ma (własne nagłówki per pozycja). */
  summaryParts: string[];
  /** STANDARD, jawne: wszyscy uprawnieni z oznaczeniem (za/pr./ws./ng.), posortowani wg rangi znacznika. */
  standardRows?: { name: string; mark: string }[];
  /** PACKAGE: podsuma per pozycja (w kolejności VoteOption.order). */
  packagePositions?: { label: string; yes: number; no: number; abstain: number; glosowalo: number }[];
  /** PACKAGE, jawne: wszyscy uprawnieni x pozycje (marks[i] odpowiada packagePositions[i]). */
  packageRows?: { name: string; marks: string[] }[];
  /** LIST: kandydaci wg kolejności na liście (VoteOption.order) - do numeracji kolumn 1..N. */
  candidates?: string[];
  candidatesCount?: number;
  /** LIST: wynik łączny kandydat/głosów, posortowany ALFABETYCZNIE (jak w iOBRADACH). */
  listCandidates?: { label: string; yes: number }[];
  /** LIST, jawne: wyłącznie głosujący x kandydaci w kolejności `candidates` ("za" / "pr."). */
  listVoterRows?: { name: string; marks: string[] }[];
  /** LIST, jawne: niegłosujący (osobna lista, "ng."). */
  listNonVoterNames?: string[];
  /** LIST, jawne: liczba osób, które oddały głos, ale nie poparły żadnej kandydatury. */
  againstAllCount?: number;
  /** Rozstrzygnięcie - dowolna treść operatora, drukowana na końcu bloku pozycji. */
  resolution?: string | null;
}

function fullName(last: string | null, first: string | null): string {
  return `${last ?? ""} ${first ?? ""}`.trim();
}
function fullNameUpper(last: string | null, first: string | null): string {
  return fullName(last, first).toUpperCase();
}

export function buildItemReport(item: ReportItemInput, participants: ReportParticipant[], caseInfo: ReportCaseInfo): ItemReportBlock {
  const secret = item.visibility === "SECRET";
  const eligible = item.resultEligibleCount ?? participants.length;
  const cast = item.resultCastCount ?? 0;
  const notVoted = Math.max(eligible - cast, 0);

  const block: ItemReportBlock = {
    order: item.order,
    title: item.title,
    description: item.description,
    secret,
    caseInfo,
    eligibleCount: eligible,
    summaryParts: [],
    resolution: item.resolution,
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
      block.standardRows = sortedParticipants
        .map((p) => {
          const choice = byUser.get(p.userId);
          return { name: fullNameUpper(p.lastName, p.firstName), mark: choice ? MARK[choice] : NOT_VOTED_MARK };
        })
        .sort((a, b) => (STANDARD_RANK[a.mark] ?? 5) - (STANDARD_RANK[b.mark] ?? 5) || comparePl(a.name, b.name));
    }
  } else if (item.type === "PACKAGE") {
    block.summaryParts = [`GŁOSOWAŁO - ${cast}`, `NIE GŁOSOWAŁO - ${notVoted}`];
    block.packagePositions = item.options.map((o) => {
      const yes = o.resultYes ?? 0, no = o.resultNo ?? 0, abstain = o.resultAbstain ?? 0;
      return { label: o.label, yes, no, abstain, glosowalo: yes + no + abstain };
    });
    if (!secret) {
      const byUser = new Map(item.ballots.map((b) => [b.userId, b]));
      block.packageRows = sortedParticipants
        .map((p) => {
          const ballot = byUser.get(p.userId);
          const marks = item.options.map((o) => {
            if (!ballot) return NOT_VOTED_MARK;
            const sel = ballot.selections.find((s) => s.optionId === o.id);
            return sel?.choice ? MARK[sel.choice] : NOT_VOTED_MARK;
          });
          return { name: fullNameUpper(p.lastName, p.firstName), marks, _voted: !!ballot };
        })
        .sort((a, b) => (a._voted === b._voted ? comparePl(a.name, b.name) : a._voted ? -1 : 1))
        .map(({ name, marks }) => ({ name, marks }));
    }
  } else if (item.type === "LIST") {
    block.summaryParts = [`GŁOSOWAŁO - ${cast}`, `NIE GŁOSOWAŁO - ${notVoted}`];
    block.candidates = item.options.map((o) => o.label);
    block.candidatesCount = item.options.length;
    block.listCandidates = [...item.options.map((o) => ({ label: o.label, yes: o.resultYes ?? 0 }))].sort((a, b) => comparePl(a.label, b.label));
    if (!secret) {
      const voterIds = new Set(item.ballots.map((b) => b.userId));
      const voters = sortedParticipants.filter((p) => voterIds.has(p.userId));
      const byUser = new Map(item.ballots.map((b) => [b.userId, b]));
      block.listVoterRows = voters.map((p) => {
        const ballot = byUser.get(p.userId);
        const selected = new Set((ballot?.selections ?? []).map((s) => s.optionId));
        return { name: fullNameUpper(p.lastName, p.firstName), marks: item.options.map((o) => (selected.has(o.id) ? "za" : "pr.")) };
      });
      block.listNonVoterNames = sortedParticipants.filter((p) => !voterIds.has(p.userId)).map((p) => fullNameUpper(p.lastName, p.firstName));
      // Głosujący, którzy nie poparli żadnej kandydatury (pusty ballot - dopuszczalne, gdy minSelections = 0).
      block.againstAllCount = item.ballots.filter((b) => b.selections.length === 0).length;
    }
  }

  return block;
}
