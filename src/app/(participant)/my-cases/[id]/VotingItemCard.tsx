"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { VoteChoice, VoteType, VoteVisibility } from "@prisma/client";
import { useHotkeys } from "@/lib/useHotkeys";

type Option = { id: string; label: string; description: string | null };
type Item = {
  id: string; order: number; title: string; description: string | null;
  type: VoteType; visibility: VoteVisibility;
  minSelections: number | null; maxSelections: number | null;
  options: Option[];
};

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
  const [selectedIds, setSelectedIds] = useState<string[]>(mySelectedOptionIds);

  const isList = item.type === "LIST";
  const secret = item.visibility === "SECRET";
  // "Pierwszy głos ostateczny": po oddaniu głosu chowamy panel głosowania w całości
  // (przyciski/lista niepotrzebne) i zostaje sam komunikat "Twój głos" poniżej.
  const locked = secret ? alreadyVoted : (alreadyVoted && !allowVoteChange);

  function submit(body: unknown) {
    setError(null);
    startTransition(async () => {
      const r = await fetch(`/api/votes/${item.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) router.refresh(); else setError(await r.text());
    });
  }

  return (
    <div className="card slide-in" style={{ borderColor: "var(--color-live)", borderWidth: 2 }}>
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ background: "var(--color-no-bg)", borderColor: "var(--color-live)" }}>
        <span className="pill pill-live">Trwa głosowanie - {secret ? "tajne" : "jawne"}</span>
      </div>
      <div className="p-6">
        <h2 style={{ fontSize: 22, lineHeight: 1.2 }} className="mb-2">{item.order}. {item.title}</h2>
        {item.description && <p className="text-sm mb-5" style={{ color: "var(--color-ink-2)" }}>{item.description}</p>}

        {!locked && (
          item.type === "PACKAGE" ? (
            <PackageBallot
              options={item.options}
              secret={secret}
              preset={myPackageChoices}
              alreadyVoted={alreadyVoted}
              pending={pending}
              onCast={(selections) => submit({ selections })}
            />
          ) : !isList ? (
            <StandardBallot
              myChoice={myChoice}
              secret={secret}
              pending={pending}
              onCast={(choice) => submit({ choice })}
            />
          ) : (
            <ListBallot
              options={item.options}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              min={item.minSelections ?? 0}
              max={item.maxSelections ?? item.options.length}
              onCast={() => submit({ optionIds: selectedIds })}
              pending={pending}
              alreadyVoted={alreadyVoted}
            />
          )
        )}

        {error && (
          <div className="mt-4 px-3 py-2 text-sm" style={{ background: "var(--color-no-bg)", border: "1px solid var(--color-no)", color: "var(--color-no)" }}>
            {error}
          </div>
        )}

        {alreadyVoted && !secret && item.type === "STANDARD" && myChoice && (
          <div
            className="mt-5 px-4 py-3 text-center"
            style={{
              border: "2px solid var(--color-ink)",
              background: myChoice === "YES" ? "var(--color-yes-bg)" : myChoice === "NO" ? "var(--color-no-bg)" : "var(--color-abstain-bg)",
            }}
          >
            <div className="eyebrow" style={{ fontSize: 10 }}>Twój głos</div>
            <div className="text-lg font-medium" style={{ color: myChoice === "YES" ? "var(--color-yes)" : myChoice === "NO" ? "var(--color-no)" : "var(--color-abstain)" }}>
              {myChoice === "YES" ? "ZA" : myChoice === "NO" ? "PRZECIW" : "WSTRZYMAŁEŚ SIĘ"}
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>
              {locked ? "Głos jest ostateczny - nie można go zmienić." : "Możesz zmienić swój głos do czasu zamknięcia sprawy."}
            </p>
          </div>
        )}

        {alreadyVoted && !secret && (isList || item.type === "PACKAGE") && (
          <div className="mt-5 px-4 py-3 text-center" style={{ border: "2px solid var(--color-ink)", background: "var(--color-yes-bg)" }}>
            <div className="eyebrow" style={{ fontSize: 10 }}>Twój głos</div>
            <div className="text-lg font-medium" style={{ color: "var(--color-yes)" }}>Głos został oddany</div>
            <p className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>
              {locked ? "Głos jest ostateczny - nie można go zmienić." : "Możesz zmienić swój wybór do czasu zamknięcia sprawy."}
            </p>
          </div>
        )}

        {alreadyVoted && secret && (
          <div className="mt-5 px-4 py-3 text-center" style={{ border: "2px solid var(--color-ink)", background: "var(--color-paper-2)" }}>
            <div className="eyebrow" style={{ fontSize: 10 }}>Głosowanie tajne</div>
            <div className="text-lg font-medium" style={{ color: "var(--color-ink)" }}>Twój głos został oddany</div>
            <p className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>Wybór pozostaje anonimowy i nie jest nigdzie zapisywany.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StandardBallot({
  myChoice, secret, onCast, pending,
}: {
  myChoice: VoteChoice | null;
  secret: boolean;
  onCast: (c: VoteChoice) => void;
  pending: boolean;
}) {
  const buttons: { choice: VoteChoice; label: string; cls: string; hk: string }[] = [
    { choice: "YES", label: "Za", cls: "btn-yes", hk: "Z" },
    { choice: "NO", label: "Przeciw", cls: "btn-no", hk: "P" },
    { choice: "ABSTAIN", label: "Wstrzymuję się", cls: "btn-abstain", hk: "W" },
  ];
  const canVote = !pending;
  useHotkeys([
    { key: "z", enabled: canVote, action: () => onCast("YES"), description: "Głos: Za" },
    { key: "p", enabled: canVote, action: () => onCast("NO"), description: "Głos: Przeciw" },
    { key: "w", enabled: canVote, action: () => onCast("ABSTAIN"), description: "Głos: Wstrzymuję się" },
  ], [canVote]);
  return (
    <div className="grid grid-cols-1 gap-3">
      {buttons.map((b) => {
        // W głosowaniu TAJNYM nigdy nie pokazujemy który przycisk został wybrany.
        const isMine = !secret && myChoice === b.choice;
        return (
          <button
            key={b.choice}
            disabled={pending}
            onClick={() => onCast(b.choice)}
            className={`btn ${b.cls} btn-xl`}
            style={{ outline: isMine ? "3px solid var(--color-ink)" : undefined, outlineOffset: 2, opacity: pending ? 0.7 : 1 }}
          >
            {b.label} <span style={{ opacity: 0.6, fontSize: "0.8em" }}>({b.hk})</span>{isMine && " ✓"}
          </button>
        );
      })}
    </div>
  );
}

function ListBallot({
  options, selectedIds, setSelectedIds, min, max, onCast, pending, alreadyVoted,
}: {
  options: Option[];
  selectedIds: string[];
  setSelectedIds: (s: string[]) => void;
  min: number; max: number;
  onCast: () => void;
  pending: boolean;
  alreadyVoted: boolean;
}) {
  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((s) => s !== id));
    } else {
      if (selectedIds.length >= max) return;
      setSelectedIds([...selectedIds, id]);
    }
  }

  const remaining = max - selectedIds.length;
  const tooFew = selectedIds.length < min;

  // Model "sejmowy": lista z aktywną pozycją, którą przesuwamy strzałkami.
  // Domyślnie każda pozycja = "przeciw" (niezaznaczona). Z lub "+" zaznacza aktywną jako ZA, "-" kasuje.
  const [activeIdx, setActiveIdx] = useState(0);
  const canAct = !pending;
  const markActive = () => {
    const o = options[activeIdx];
    if (!o) return;
    if (!selectedIds.includes(o.id) && selectedIds.length >= max) return;
    if (!selectedIds.includes(o.id)) {
      setSelectedIds([...selectedIds, o.id]);
      if (activeIdx < options.length - 1) setActiveIdx((i) => i + 1);
    }
  };
  const unmarkActive = () => {
    const o = options[activeIdx];
    if (!o) return;
    if (selectedIds.includes(o.id)) setSelectedIds(selectedIds.filter((s) => s !== o.id));
  };
  useHotkeys([
    { key: "ArrowDown", enabled: canAct, action: () => setActiveIdx((i) => Math.min(options.length - 1, i + 1)), description: "Następna pozycja" },
    { key: "ArrowUp", enabled: canAct, action: () => setActiveIdx((i) => Math.max(0, i - 1)), description: "Poprzednia pozycja" },
    { key: "z", enabled: canAct, action: markActive, description: "ZA dla aktywnej pozycji" },
    { key: "+", enabled: canAct, action: markActive, description: "ZA dla aktywnej pozycji" },
    { key: "=", enabled: canAct, action: markActive, description: "ZA dla aktywnej pozycji" },
    { key: "-", enabled: canAct, action: unmarkActive, description: "Kasuj wybór aktywnej pozycji" },
    { key: "o", enabled: canAct && !tooFew, action: onCast, description: "Zatwierdź i wyślij głos" },
  ], [canAct, tooFew, activeIdx, selectedIds.join(","), options.map((o) => o.id).join(",")]);

  return (
    <div>
      <p className="text-xs mb-3" style={{ color: "var(--color-ink-3)" }}>
        Wybierz {min === max ? `dokładnie ${min}` : `od ${min} do ${max}`} opcji. <strong>Niezaznaczenie = głos przeciw danemu kandydatowi.</strong>
      </p>
      <ul className="border border-[var(--color-rule)] divide-y divide-[var(--color-rule-soft)]">
        {options.map((o, i) => {
          const checked = selectedIds.includes(o.id);
          const disabled = !checked && selectedIds.length >= max;
          const isActive = i === activeIdx;
          return (
            <li key={o.id} style={{ outline: isActive ? "2px solid var(--color-brand-blue)" : "none", outlineOffset: -2 }}>
              <label
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${disabled ? "opacity-40" : "hover:bg-[var(--color-paper-2)]"}`}
                style={{ background: checked ? "var(--color-yes-bg)" : undefined }}
                onClick={() => setActiveIdx(i)}
              >
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(o.id)} style={{ width: 20, height: 20 }} />
                <span className="mono text-xs" style={{ color: "var(--color-ink-3)", width: 24 }}>{i + 1}.</span>
                <span className="text-base flex-1">{o.label}</span>
                {checked && <span className="pill pill-ok" style={{ fontSize: 10 }}>ZA</span>}
                {!checked && <span className="pill pill-bad" style={{ fontSize: 10 }}>PRZECIW</span>}
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between mt-4 text-xs" style={{ color: "var(--color-ink-3)" }}>
        <span>
          Zaznaczono: <span className="mono">{selectedIds.length}</span> / {max}
          {remaining > 0 && ` (pozostało ${remaining})`}
        </span>
        {tooFew && <span style={{ color: "var(--color-no)" }}>Wymagane co najmniej {min}</span>}
      </div>

      <button className="btn btn-primary btn-lg w-full mt-4" disabled={pending || tooFew} onClick={onCast}>
        {pending ? "Wysyłam…" : alreadyVoted ? "Aktualizuj głos" : "Zatwierdź i wyślij głos"}
      </button>
    </div>
  );
}

function PackageBallot({
  options, secret, preset, alreadyVoted, pending, onCast,
}: {
  options: Option[];
  secret: boolean;
  preset: { optionId: string; choice: VoteChoice }[];
  alreadyVoted: boolean;
  pending: boolean;
  onCast: (choices: { optionId: string; choice: VoteChoice }[]) => void;
}) {
  const initial: Record<string, VoteChoice> = {};
  for (const c of preset) initial[c.optionId] = c.choice;
  const [choices, setChoices] = useState<Record<string, VoteChoice>>(initial);

  const set = (optionId: string, choice: VoteChoice) =>
    setChoices((p) => {
      // Ponowny klik w już wybraną opcję ODZNACZA ją.
      if (p[optionId] === choice) {
        const next = { ...p };
        delete next[optionId];
        return next;
      }
      return { ...p, [optionId]: choice };
    });

  const answered = Object.keys(choices).length;
  const canSend = answered === options.length;

  // Nawigacja klawiaturą: aktywna pozycja (strzałki góra/dół), Z/P/W ustawia głos aktywnej pozycji
  // i przechodzi do następnej; Enter wysyła cały pakiet.
  const [activeIdx, setActiveIdx] = useState(0);
  const setChoiceAndAdvance = (choice: VoteChoice) => {
    const o = options[activeIdx];
    if (!o) return;
    set(o.id, choice);
    if (activeIdx < options.length - 1) setActiveIdx((i) => i + 1);
  };
  const send = () => onCast(Object.entries(choices).map(([optionId, choice]) => ({ optionId, choice })));
  useHotkeys([
    { key: "ArrowDown", enabled: !pending, action: () => setActiveIdx((i) => Math.min(options.length - 1, i + 1)), description: "Następna pozycja" },
    { key: "ArrowUp", enabled: !pending, action: () => setActiveIdx((i) => Math.max(0, i - 1)), description: "Poprzednia pozycja" },
    { key: "z", enabled: !pending, action: () => setChoiceAndAdvance("YES"), description: "Aktywna pozycja: Za" },
    { key: "p", enabled: !pending, action: () => setChoiceAndAdvance("NO"), description: "Aktywna pozycja: Przeciw" },
    { key: "w", enabled: !pending, action: () => setChoiceAndAdvance("ABSTAIN"), description: "Aktywna pozycja: Wstrzymuję się" },
    { key: "o", enabled: !pending && canSend, action: send, description: "Zatwierdź i wyślij pakiet" },
    { key: "Enter", enabled: !pending && canSend, action: send, description: "Wyślij pakiet" },
  ], [pending, canSend, activeIdx, JSON.stringify(choices), options.map((o) => o.id).join(",")]);

  const CHOICE_META: { key: VoteChoice; label: string; color: string; bg: string }[] = [
    { key: "YES", label: "ZA", color: "var(--color-yes)", bg: "var(--color-yes-bg)" },
    { key: "NO", label: "PRZECIW", color: "var(--color-no)", bg: "var(--color-no-bg)" },
    { key: "ABSTAIN", label: "WSTRZYMUJĘ SIĘ", color: "var(--color-abstain)", bg: "var(--color-abstain-bg)" },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4">
        {options.map((o, idx) => (
          <div
            key={o.id}
            className="pb-3"
            style={{
              borderBottom: idx < options.length - 1 ? "1px solid var(--color-rule-soft)" : "none",
              outline: idx === activeIdx ? "2px solid var(--color-brand-blue)" : "none",
              outlineOffset: 4,
              borderRadius: idx === activeIdx ? 4 : undefined,
            }}
          >
            <div className="mb-2" style={{ fontWeight: 600 }}>{idx + 1}. {o.label}</div>
            {o.description && <div className="text-sm mb-2" style={{ color: "var(--color-ink-2)" }}>{o.description}</div>}
            <div className="grid grid-cols-3 gap-2">
              {CHOICE_META.map((m) => {
                const active = choices[o.id] === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    disabled={pending}
                    onClick={() => set(o.id, m.key)}
                    className="btn"
                    style={{
                      padding: "12px 4px", fontSize: 12, fontWeight: 700,
                      border: `2px solid ${m.color}`,
                      background: active ? m.color : m.bg,
                      color: active ? "#fff" : m.color,
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary btn-lg w-full mt-5" disabled={pending || !canSend} onClick={send}>
        {pending ? "Wysyłam…" : alreadyVoted ? "Aktualizuj głosy" : "Zatwierdź i wyślij głosy"}
      </button>
      {!canSend && (
        <p className="text-xs mt-2 text-center" style={{ color: "var(--color-ink-3)" }}>
          Oddaj głos na wszystkie pozycje ({answered}/{options.length}).
        </p>
      )}
      {secret && (
        <p className="text-xs mt-2 text-center" style={{ color: "var(--color-ink-3)" }}>
          Głosowanie tajne - wybór nie jest nigdzie zapisywany z powiązaniem do Twojego konta.
        </p>
      )}
    </div>
  );
}
