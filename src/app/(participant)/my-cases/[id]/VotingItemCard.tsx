"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { VoteChoice, VoteType, VoteVisibility } from "@prisma/client";

type Option = { id: string; label: string; description: string | null };
type Item = {
  id: string; order: number; title: string; description: string | null;
  type: VoteType; visibility: VoteVisibility;
  minSelections: number | null; maxSelections: number | null;
  options: Option[];
};

const CHOICE_LABEL: Record<VoteChoice, string> = { YES: "ZA", NO: "PRZECIW", ABSTAIN: "WSTRZYMUJĘ SIĘ" };

export function VotingItemCard({
  item, allowVoteChange, alreadyVoted, myChoice, mySelectedOptionIds, myPackageChoices,
}: {
  item: Item;
  allowVoteChange: boolean;
  alreadyVoted: boolean;
  myChoice: VoteChoice | null;
  mySelectedOptionIds: string[];
  myPackageChoices: { optionId: string; choice: VoteChoice }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const locked = item.visibility === "SECRET"
    ? alreadyVoted
    : (alreadyVoted && !allowVoteChange);

  function submit(body: unknown) {
    setError(null);
    startTransition(async () => {
      const r = await fetch(`/api/votes/${item.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) { setDone(true); router.refresh(); } else setError(await r.text());
    });
  }

  return (
    <div className="card p-4">
      <div className="font-medium text-sm">{item.order}. {item.title}</div>
      {item.description && <div className="text-sm mt-1" style={{ color: "var(--color-ink-2)" }}>{item.description}</div>}
      <div className="text-xs mt-2" style={{ color: "var(--color-ink-3)" }}>
        {item.visibility === "SECRET" ? "Głosowanie tajne — pierwszy oddany głos jest ostateczny." : (allowVoteChange ? "Głos można zmienić do zamknięcia sprawy." : "Zmiana głosu nie jest dopuszczona w tej sprawie.")}
      </div>

      {locked ? (
        <div className="mt-3 text-sm" style={{ color: "var(--color-yes)" }}>
          {done ? "Głos zapisany." : "Głos został już oddany."}
          {item.visibility === "OPEN" && myChoice && <span> Twój głos: <strong>{CHOICE_LABEL[myChoice]}</strong>.</span>}
        </div>
      ) : (
        <div className="mt-3">
          {item.type === "STANDARD" && (
            <StandardForm pending={pending} preset={myChoice} onSubmit={(choice) => submit({ choice })} />
          )}
          {item.type === "PACKAGE" && (
            <PackageForm options={item.options} pending={pending} preset={myPackageChoices} onSubmit={(selections) => submit({ selections })} />
          )}
          {item.type === "LIST" && (
            <ListForm options={item.options} min={item.minSelections} max={item.maxSelections} pending={pending} preset={mySelectedOptionIds} onSubmit={(optionIds) => submit({ optionIds })} />
          )}
          {alreadyVoted && !locked && <div className="text-xs mt-2" style={{ color: "var(--color-ink-3)" }}>Zmiana zastąpi wcześniej oddany głos.</div>}
        </div>
      )}
      {error && <div className="text-sm mt-2" style={{ color: "var(--color-no)" }}>{error}</div>}
    </div>
  );
}

function StandardForm({ pending, preset, onSubmit }: { pending: boolean; preset: VoteChoice | null; onSubmit: (choice: VoteChoice) => void }) {
  return (
    <div className="flex gap-2">
      <button className="btn btn-yes flex-1" disabled={pending} onClick={() => onSubmit("YES")}>{preset === "YES" ? "✓ " : ""}ZA</button>
      <button className="btn btn-no flex-1" disabled={pending} onClick={() => onSubmit("NO")}>{preset === "NO" ? "✓ " : ""}PRZECIW</button>
      <button className="btn btn-abstain flex-1" disabled={pending} onClick={() => onSubmit("ABSTAIN")}>{preset === "ABSTAIN" ? "✓ " : ""}WSTRZYMUJĘ SIĘ</button>
    </div>
  );
}

function PackageForm({
  options, pending, preset, onSubmit,
}: { options: Option[]; pending: boolean; preset: { optionId: string; choice: VoteChoice }[]; onSubmit: (selections: { optionId: string; choice: VoteChoice }[]) => void }) {
  const [choices, setChoices] = useState<Record<string, VoteChoice>>(
    Object.fromEntries(preset.map((p) => [p.optionId, p.choice])),
  );
  const complete = options.every((o) => choices[o.id]);
  return (
    <div className="space-y-3">
      {options.map((o) => (
        <div key={o.id} className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm min-w-0">{o.label}</span>
          <div className="flex gap-1">
            {(["YES", "NO", "ABSTAIN"] as VoteChoice[]).map((c) => (
              <button key={c} type="button" disabled={pending}
                className={`btn btn-sm ${c === "YES" ? "btn-yes" : c === "NO" ? "btn-no" : "btn-abstain"}`}
                style={{ opacity: choices[o.id] === c ? 1 : 0.45 }}
                onClick={() => setChoices((s) => ({ ...s, [o.id]: c }))}>
                {CHOICE_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button className="btn btn-primary btn-sm" disabled={pending || !complete}
        onClick={() => onSubmit(options.map((o) => ({ optionId: o.id, choice: choices[o.id] })))}>
        Zatwierdź głos na wszystkie pozycje
      </button>
    </div>
  );
}

function ListForm({
  options, min, max, pending, preset, onSubmit,
}: { options: Option[]; min: number | null; max: number | null; pending: boolean; preset: string[]; onSubmit: (optionIds: string[]) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(preset));
  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else { if (max != null && n.size >= max) return n; n.add(id); }
      return n;
    });
  }
  const valid = (min == null || selected.size >= min) && (max == null || selected.size <= max);
  return (
    <div className="space-y-2">
      {(min != null || max != null) && (
        <div className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          Zaznacz {min != null ? `co najmniej ${min}` : ""}{min != null && max != null ? " i " : ""}{max != null ? `co najwyżej ${max}` : ""} pozycji.
        </div>
      )}
      <ul className="space-y-1">
        {options.map((o) => (
          <li key={o.id}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.has(o.id)} disabled={pending} onChange={() => toggle(o.id)} />
              {o.label}
            </label>
          </li>
        ))}
      </ul>
      <button className="btn btn-primary btn-sm" disabled={pending || !valid} onClick={() => onSubmit(Array.from(selected))}>
        Zatwierdź głos
      </button>
    </div>
  );
}
