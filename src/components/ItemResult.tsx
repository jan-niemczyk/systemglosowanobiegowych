import type { ItemStatus, VoteChoice, VoteType, VoteVisibility } from "@prisma/client";
import { VOTE_VISIBILITY_LABEL, CHOICE_LABEL } from "@/lib/labels";

type OptionResult = { id: string; label: string; resultYes: number | null; resultNo: number | null; resultAbstain: number | null };
type BallotResult = {
  voterFirstName: string | null;
  voterLastName: string | null;
  choice: VoteChoice | null;
  selections: { optionId: string; choice: VoteChoice | null }[];
};
type Item = {
  id: string; order: number; title: string; description: string | null;
  type: VoteType; visibility: VoteVisibility;
  status: ItemStatus;
  resultEligibleCount: number | null; resultCastCount: number | null;
  resultYes: number | null; resultNo: number | null; resultAbstain: number | null;
  options: OptionResult[];
  /** Wyniki imienne - wyłącznie dla pozycji jawnych, dostarczone gdy dostępne (po zamknięciu/publikacji). */
  ballots?: BallotResult[];
};

export function ItemResult({ item }: { item: Item; showVoting?: boolean }) {
  const closed = item.status === "CLOSED";
  const namedRows = item.visibility === "OPEN" && item.ballots
    ? [...item.ballots].sort((a, b) => (a.voterLastName ?? "").localeCompare(b.voterLastName ?? "", "pl"))
    : null;
  const againstAllCount = item.type === "LIST" && namedRows
    ? namedRows.filter((b) => b.selections.length === 0).length
    : 0;

  return (
    <div className="card card-soft p-4">
      <div className="d-flex align-items-start justify-content-between gap-3">
        <div>
          <div className="fw-medium small">{item.order}. {item.title}</div>
          <div className="text-secondary-emphasis mt-1" style={{ fontSize: 12 }}>
            {VOTE_VISIBILITY_LABEL[item.visibility]}
          </div>
        </div>
        {!closed && <span className="badge badge-live">Trwa głosowanie</span>}
      </div>

      {closed && (
        <div className="mt-3 small d-flex flex-column gap-3">
          <div className="text-secondary-emphasis">
            Uprawnionych: {item.resultEligibleCount ?? "-"} Oddano głosów: {item.resultCastCount ?? "-"}
          </div>
          {item.type === "STANDARD" && (
            <div className="d-flex gap-4 num">
              <span className="text-vote-yes">ZA: {item.resultYes ?? 0}</span>
              <span className="text-vote-no">PRZECIW: {item.resultNo ?? 0}</span>
              <span className="text-vote-abstain">WSTRZ.: {item.resultAbstain ?? 0}</span>
            </div>
          )}
          {(item.type === "PACKAGE" || item.type === "LIST") && item.options.length > 0 && (
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr className="text-secondary-emphasis">
                  <th className="fw-normal">Pozycja</th>
                  <th className="fw-normal num text-end">ZA</th>
                  <th className="fw-normal num text-end">PRZECIW</th>
                  {item.type === "PACKAGE" && <th className="fw-normal num text-end">WSTRZ.</th>}
                </tr>
              </thead>
              <tbody>
                {item.options.map((o) => (
                  <tr key={o.id}>
                    <td>{o.label}</td>
                    <td className="num text-end text-vote-yes">{o.resultYes ?? 0}</td>
                    <td className="num text-end text-vote-no">{o.resultNo ?? 0}</td>
                    {item.type === "PACKAGE" && <td className="num text-end text-vote-abstain">{o.resultAbstain ?? 0}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {item.visibility === "SECRET" && (
            <div className="fst-italic text-secondary-emphasis" style={{ fontSize: 12 }}>Głosowanie tajne - bez wykazu imiennego.</div>
          )}

          {namedRows && namedRows.length > 0 && (
            <div>
              <div className="eyebrow mb-1">Wyniki imienne</div>
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr className="text-secondary-emphasis">
                    <th className="fw-normal">Nazwisko i imię</th>
                    <th className="fw-normal">Głos</th>
                  </tr>
                </thead>
                <tbody>
                  {namedRows.map((b, i) => (
                    <tr key={i}>
                      <td>{b.voterLastName} {b.voterFirstName}</td>
                      <td>
                        {item.type === "STANDARD"
                          ? (b.choice ? CHOICE_LABEL[b.choice] : "-")
                          : item.type === "PACKAGE"
                            ? b.selections.map((s) => `${item.options.find((o) => o.id === s.optionId)?.label ?? ""}: ${s.choice ? CHOICE_LABEL[s.choice] : "-"}`).join("; ")
                            : item.options.map((o) => `${o.label}: ${b.selections.some((s) => s.optionId === o.id) ? "za" : "pr."}`).join("; ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {item.type === "LIST" && againstAllCount > 0 && (
                <div className="text-secondary-emphasis mt-1" style={{ fontSize: 12 }}>
                  Żadnej kandydatury nie poparło: {againstAllCount}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
