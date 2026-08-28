import type { ItemStatus, VoteChoice, VoteType, VoteVisibility } from "@prisma/client";
import { VOTE_TYPE_LABEL, VOTE_VISIBILITY_LABEL, CHOICE_LABEL } from "@/lib/labels";

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

  return (
    <div className="card-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-sm">{item.order}. {item.title}</div>
          <div className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>
            {VOTE_TYPE_LABEL[item.type]} {VOTE_VISIBILITY_LABEL[item.visibility]}
          </div>
        </div>
        {!closed && <span className="pill pill-live">Trwa głosowanie</span>}
      </div>

      {closed && (
        <div className="mt-3 text-sm space-y-3">
          <div style={{ color: "var(--color-ink-3)" }}>
            Uprawnionych: {item.resultEligibleCount ?? "-"} Oddano głosów: {item.resultCastCount ?? "-"}
          </div>
          {item.type === "STANDARD" && (
            <div className="flex gap-4 num">
              <span style={{ color: "var(--color-yes)" }}>ZA: {item.resultYes ?? 0}</span>
              <span style={{ color: "var(--color-no)" }}>PRZECIW: {item.resultNo ?? 0}</span>
              <span style={{ color: "var(--color-abstain)" }}>WSTRZ.: {item.resultAbstain ?? 0}</span>
            </div>
          )}
          {(item.type === "PACKAGE" || item.type === "LIST") && item.options.length > 0 && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left" style={{ color: "var(--color-ink-3)" }}>
                  <th className="pb-1 font-normal">Pozycja</th>
                  <th className="pb-1 font-normal num">ZA</th>
                  <th className="pb-1 font-normal num">PRZECIW</th>
                  {item.type === "PACKAGE" && <th className="pb-1 font-normal num">WSTRZ.</th>}
                </tr>
              </thead>
              <tbody>
                {item.options.map((o) => (
                  <tr key={o.id} className="border-t" style={{ borderColor: "var(--color-rule-soft)" }}>
                    <td className="py-1">{o.label}</td>
                    <td className="py-1 num" style={{ color: "var(--color-yes)" }}>{o.resultYes ?? 0}</td>
                    <td className="py-1 num" style={{ color: "var(--color-no)" }}>{o.resultNo ?? 0}</td>
                    {item.type === "PACKAGE" && <td className="py-1 num" style={{ color: "var(--color-abstain)" }}>{o.resultAbstain ?? 0}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {item.visibility === "SECRET" && (
            <div className="text-xs italic" style={{ color: "var(--color-ink-3)" }}>Głosowanie tajne - bez wykazu imiennego.</div>
          )}

          {namedRows && namedRows.length > 0 && (
            <div>
              <div className="eyebrow mb-1">Wyniki imienne</div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left" style={{ color: "var(--color-ink-3)" }}>
                    <th className="pb-1 font-normal">Nazwisko i imię</th>
                    <th className="pb-1 font-normal">Głos</th>
                  </tr>
                </thead>
                <tbody>
                  {namedRows.map((b, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "var(--color-rule-soft)" }}>
                      <td className="py-1">{b.voterLastName} {b.voterFirstName}</td>
                      <td className="py-1">
                        {item.type === "STANDARD"
                          ? (b.choice ? CHOICE_LABEL[b.choice] : "-")
                          : item.type === "PACKAGE"
                            ? b.selections.map((s) => `${item.options.find((o) => o.id === s.optionId)?.label ?? ""}: ${s.choice ? CHOICE_LABEL[s.choice] : "-"}`).join("; ")
                            : (b.selections.map((s) => item.options.find((o) => o.id === s.optionId)?.label).filter(Boolean).join(", ") || "(brak zaznaczeń)")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
