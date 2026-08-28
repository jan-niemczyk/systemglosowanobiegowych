import type { VoteChoice, VoteType, VoteVisibility } from "@prisma/client";
import { VOTE_TYPE_LABEL, VOTE_VISIBILITY_LABEL } from "@/lib/labels";

type Participant = { userId: string; firstName: string; lastName: string; hasVotingRight: boolean };

/**
 * Podgląd operatora dla pozycji W TRAKCIE głosowania: ile już oddano głosów,
 * cząstkowy wynik (jawne - liczbowo; tajne - tylko fakt oddania, bez wyboru)
 * oraz kto głosował / kto jeszcze nie.
 */
export function LiveItemPanel({
  item, participants, votedUserIds, tally,
}: {
  item: { id: string; order: number; title: string; type: VoteType; visibility: VoteVisibility };
  participants: Participant[];
  votedUserIds: Set<string>;
  tally: { yes: number; no: number; abstain: number } | null;
}) {
  const eligible = participants.filter((p) => p.hasVotingRight);
  const voted = eligible.filter((p) => votedUserIds.has(p.userId)).sort((a, b) => a.lastName.localeCompare(b.lastName, "pl"));
  const notVoted = eligible.filter((p) => !votedUserIds.has(p.userId)).sort((a, b) => a.lastName.localeCompare(b.lastName, "pl"));

  return (
    <div className="card-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-sm">{item.order}. {item.title}</div>
          <div className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>
            {VOTE_TYPE_LABEL[item.type]} {VOTE_VISIBILITY_LABEL[item.visibility]}
          </div>
        </div>
        <span className="pill pill-live">Trwa głosowanie</span>
      </div>

      <div className="mt-3 text-sm space-y-3">
        <div style={{ color: "var(--color-ink-3)" }}>
          Oddano głosów: <span className="num">{voted.length}</span> / <span className="num">{eligible.length}</span>
        </div>

        {tally && (
          <div className="flex gap-4 num">
            <span style={{ color: "var(--color-yes)" }}>ZA: {tally.yes}</span>
            <span style={{ color: "var(--color-no)" }}>PRZECIW: {tally.no}</span>
            <span style={{ color: "var(--color-abstain)" }}>WSTRZ.: {tally.abstain}</span>
          </div>
        )}
        {item.visibility === "SECRET" && (
          <div className="text-xs italic" style={{ color: "var(--color-ink-3)" }}>Głosowanie tajne - wybór nie jest widoczny przed zamknięciem.</div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="eyebrow mb-1">Głosowali ({voted.length})</div>
            {voted.length === 0 ? <p style={{ color: "var(--color-ink-3)" }}>-</p> : (
              <ul className="space-y-0.5">
                {voted.map((p) => <li key={p.userId}>{p.lastName} {p.firstName}</li>)}
              </ul>
            )}
          </div>
          <div>
            <div className="eyebrow mb-1">Jeszcze nie głosowali ({notVoted.length})</div>
            {notVoted.length === 0 ? <p style={{ color: "var(--color-ink-3)" }}>-</p> : (
              <ul className="space-y-0.5">
                {notVoted.map((p) => <li key={p.userId}>{p.lastName} {p.firstName}</li>)}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Cząstkowe zliczenie ZA/PRZECIW/WSTRZ. dla pozycji STANDARD jawnej - null dla pozostałych. */
export function computeLiveTally(
  item: { type: VoteType; visibility: VoteVisibility },
  ballots: { choice: VoteChoice | null }[],
): { yes: number; no: number; abstain: number } | null {
  if (item.type !== "STANDARD" || item.visibility !== "OPEN") return null;
  let yes = 0, no = 0, abstain = 0;
  for (const b of ballots) {
    if (b.choice === "YES") yes++;
    else if (b.choice === "NO") no++;
    else if (b.choice === "ABSTAIN") abstain++;
  }
  return { yes, no, abstain };
}
