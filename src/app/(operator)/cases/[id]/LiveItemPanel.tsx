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
    <div className="card card-soft p-4">
      <div className="d-flex align-items-start justify-content-between gap-3">
        <div>
          <div className="fw-medium small">{item.order}. {item.title}</div>
          <div className="text-secondary-emphasis mt-1" style={{ fontSize: 12 }}>
            {VOTE_TYPE_LABEL[item.type]} {VOTE_VISIBILITY_LABEL[item.visibility]}
          </div>
        </div>
        <span className="badge badge-live">Trwa głosowanie</span>
      </div>

      <div className="mt-3 small d-flex flex-column gap-3">
        <div className="text-secondary-emphasis">
          Oddano głosów: <span className="num">{voted.length}</span> / <span className="num">{eligible.length}</span>
        </div>

        {tally && (
          <div className="d-flex gap-4 num">
            <span className="text-vote-yes">ZA: {tally.yes}</span>
            <span className="text-vote-no">PRZECIW: {tally.no}</span>
            <span className="text-vote-abstain">WSTRZ.: {tally.abstain}</span>
          </div>
        )}
        {item.visibility === "SECRET" && (
          <div className="fst-italic text-secondary-emphasis" style={{ fontSize: 12 }}>Głosowanie tajne - wybór nie jest widoczny przed zamknięciem.</div>
        )}

        <div className="row row-cols-1 row-cols-sm-2 g-4">
          <div className="col">
            <div className="eyebrow mb-1">Głosowali ({voted.length})</div>
            {voted.length === 0 ? <p className="text-secondary-emphasis mb-0">-</p> : (
              <ul className="list-unstyled d-flex flex-column gap-1 mb-0">
                {voted.map((p) => <li key={p.userId}>{p.lastName} {p.firstName}</li>)}
              </ul>
            )}
          </div>
          <div className="col">
            <div className="eyebrow mb-1">Jeszcze nie głosowali ({notVoted.length})</div>
            {notVoted.length === 0 ? <p className="text-secondary-emphasis mb-0">-</p> : (
              <ul className="list-unstyled d-flex flex-column gap-1 mb-0">
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
