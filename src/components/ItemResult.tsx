import type { ItemStatus, MajorityBase, MajorityKind, VoteType, VoteVisibility } from "@prisma/client";
import { VOTE_TYPE_LABEL, VOTE_VISIBILITY_LABEL } from "@/lib/labels";
import { formatMajority } from "@/lib/majority";

type OptionResult = { id: string; label: string; resultYes: number | null; resultNo: number | null; resultAbstain: number | null; resultPassed: boolean | null };
type Item = {
  id: string; order: number; title: string; description: string | null;
  type: VoteType; visibility: VoteVisibility; majorityKind: MajorityKind; majorityBase: MajorityBase;
  status: ItemStatus;
  resultEligibleCount: number | null; resultCastCount: number | null;
  resultYes: number | null; resultNo: number | null; resultAbstain: number | null; resultPassed: boolean | null;
  options: OptionResult[];
};

export function ItemResult({ item }: { item: Item; showVoting?: boolean }) {
  const closed = item.status === "CLOSED";
  return (
    <div className="card-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-sm">{item.order}. {item.title}</div>
          <div className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>
            {VOTE_TYPE_LABEL[item.type]} · {VOTE_VISIBILITY_LABEL[item.visibility]} · {formatMajority(item.majorityKind, item.majorityBase)}
          </div>
        </div>
        {!closed && <span className="pill pill-live">Trwa głosowanie</span>}
        {closed && item.resultPassed != null && (
          <span className={`pill ${item.resultPassed ? "pill-ok" : "pill-bad"}`}>{item.resultPassed ? "Przyjęto" : "Odrzucono"}</span>
        )}
      </div>

      {closed && (
        <div className="mt-3 text-sm space-y-2">
          <div style={{ color: "var(--color-ink-3)" }}>
            Uprawnionych: {item.resultEligibleCount ?? "-"} · Oddano głosów: {item.resultCastCount ?? "-"}
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
                  <th className="pb-1 font-normal">Wynik</th>
                </tr>
              </thead>
              <tbody>
                {item.options.map((o) => (
                  <tr key={o.id} className="border-t" style={{ borderColor: "var(--color-rule-soft)" }}>
                    <td className="py-1">{o.label}</td>
                    <td className="py-1 num" style={{ color: "var(--color-yes)" }}>{o.resultYes ?? 0}</td>
                    <td className="py-1 num" style={{ color: "var(--color-no)" }}>{o.resultNo ?? 0}</td>
                    {item.type === "PACKAGE" && <td className="py-1 num" style={{ color: "var(--color-abstain)" }}>{o.resultAbstain ?? 0}</td>}
                    <td className="py-1">{o.resultPassed == null ? "-" : (o.resultPassed ? "Przyjęto" : "Odrzucono")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
