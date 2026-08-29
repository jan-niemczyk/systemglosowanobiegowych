"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { VoteChoice, VoteType, VoteVisibility } from "@prisma/client";

// UWAGA: ten plik ma zamrożony wygląd 1:1 z pierwotną wersją (na wyraźne życzenie -
// "aktywne pola głosowania u głosującego" nie mogą zmienić wyglądu). Tailwind zniknął
// z całej aplikacji (przejście na Bootstrap), więc poniższa migracja jest WYŁĄCZNIE
// mechaniczna: dawne klasy Tailwind/`.btn`/`.pill`/`.card` zastąpione inline-stylami
// i klasami `.legacy-*` (patrz globals.scss) reprodukującymi te same wartości co
// dawniej - żadnych nowych rozmiarów, kolorów ani układu.

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
    <div className="legacy-card slide-in" style={{ borderColor: "var(--color-live)", borderWidth: 2 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid var(--color-live)", background: "var(--color-no-bg)" }}>
        <span className="legacy-pill legacy-pill-live">Trwa głosowanie - {secret ? "tajne" : "jawne"}</span>
      </div>
      <div style={{ padding: 24 }}>
        <h2 style={{ fontSize: 22, lineHeight: 1.2, marginBottom: 8 }}>{item.order}. {item.title}</h2>
        {item.description && <p style={{ fontSize: 14, marginBottom: 20, color: "var(--color-ink-2)" }}>{item.description}</p>}

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
          <div style={{ marginTop: 16, padding: "8px 12px", fontSize: 14, background: "var(--color-no-bg)", border: "1px solid var(--color-no)", color: "var(--color-no)" }}>
            {error}
          </div>
        )}

        {alreadyVoted && !secret && item.type === "STANDARD" && myChoice && (
          <div
            style={{
              marginTop: 20, padding: "12px 16px", textAlign: "center",
              border: "2px solid var(--color-ink)",
              background: myChoice === "YES" ? "var(--color-yes-bg)" : myChoice === "NO" ? "var(--color-no-bg)" : "var(--color-abstain-bg)",
            }}
          >
            <div className="legacy-eyebrow">Twój głos</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: myChoice === "YES" ? "var(--color-yes)" : myChoice === "NO" ? "var(--color-no)" : "var(--color-abstain)" }}>
              {myChoice === "YES" ? "ZA" : myChoice === "NO" ? "PRZECIW" : "WSTRZYMAŁEŚ SIĘ"}
            </div>
            <p style={{ fontSize: 12, marginTop: 4, color: "var(--color-ink-3)" }}>
              {locked ? "Głos jest ostateczny - nie można go zmienić." : "Możesz zmienić swój głos do czasu zamknięcia sprawy."}
            </p>
          </div>
        )}

        {alreadyVoted && !secret && (isList || item.type === "PACKAGE") && (
          <div style={{ marginTop: 20, padding: "12px 16px", textAlign: "center", border: "2px solid var(--color-ink)", background: "var(--color-yes-bg)" }}>
            <div className="legacy-eyebrow">Twój głos</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "var(--color-yes)" }}>Głos został oddany</div>
            <p style={{ fontSize: 12, marginTop: 4, color: "var(--color-ink-3)" }}>
              {locked ? "Głos jest ostateczny - nie można go zmienić." : "Możesz zmienić swój wybór do czasu zamknięcia sprawy."}
            </p>
          </div>
        )}

        {alreadyVoted && secret && (
          <div style={{ marginTop: 20, padding: "12px 16px", textAlign: "center", border: "2px solid var(--color-ink)", background: "var(--color-paper-2)" }}>
            <div className="legacy-eyebrow">Głosowanie tajne</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "var(--color-ink)" }}>Twój głos został oddany</div>
            <p style={{ fontSize: 12, marginTop: 4, color: "var(--color-ink-3)" }}>Wybór pozostaje anonimowy i nie jest nigdzie zapisywany.</p>
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
  const buttons: { choice: VoteChoice; label: string; cls: string }[] = [
    { choice: "YES", label: "Za", cls: "legacy-btn-yes" },
    { choice: "NO", label: "Przeciw", cls: "legacy-btn-no" },
    { choice: "ABSTAIN", label: "Wstrzymuję się", cls: "legacy-btn-abstain" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {buttons.map((b) => {
        // W głosowaniu TAJNYM nigdy nie pokazujemy który przycisk został wybrany.
        const isMine = !secret && myChoice === b.choice;
        return (
          <button
            key={b.choice}
            disabled={pending}
            onClick={() => onCast(b.choice)}
            className={`legacy-btn ${b.cls} legacy-btn-xl`}
            style={{ outline: isMine ? "3px solid var(--color-ink)" : undefined, outlineOffset: 2, opacity: pending ? 0.7 : 1 }}
          >
            {b.label}{isMine && " ✓"}
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

  return (
    <div>
      <p style={{ fontSize: 12, marginBottom: 12, color: "var(--color-ink-3)" }}>
        Wybierz {min === max ? `dokładnie ${min}` : `od ${min} do ${max}`} opcji. <strong>Niezaznaczenie = głos przeciw danemu kandydatowi.</strong>
      </p>
      <ul style={{ border: "1px solid var(--color-rule)", listStyle: "none", margin: 0, padding: 0 }}>
        {options.map((o, i) => {
          const checked = selectedIds.includes(o.id);
          const disabled = !checked && selectedIds.length >= max;
          return (
            <li key={o.id} style={{ borderTop: i > 0 ? "1px solid var(--color-rule-soft)" : undefined }}>
              <label
                className={disabled ? undefined : "legacy-option-row"}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  cursor: disabled ? "default" : "pointer",
                  opacity: disabled ? 0.4 : 1,
                  background: checked ? "var(--color-yes-bg)" : undefined,
                }}
              >
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(o.id)} style={{ width: 20, height: 20 }} />
                <span className="num" style={{ fontSize: 12, color: "var(--color-ink-3)", width: 24 }}>{i + 1}.</span>
                <span style={{ fontSize: 16, flex: 1 }}>{o.label}</span>
                {checked && <span className="legacy-pill" style={{ fontSize: 10, borderColor: "var(--color-yes)", color: "var(--color-yes)", background: "var(--color-yes-bg)" }}>ZA</span>}
                {!checked && <span className="legacy-pill" style={{ fontSize: 10, borderColor: "var(--color-no)", color: "var(--color-no)", background: "var(--color-no-bg)" }}>PRZECIW</span>}
              </label>
            </li>
          );
        })}
      </ul>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, fontSize: 12, color: "var(--color-ink-3)" }}>
        <span>
          Zaznaczono: <span className="num">{selectedIds.length}</span> / {max}
          {remaining > 0 && ` (pozostało ${remaining})`}
        </span>
        {tooFew && <span style={{ color: "var(--color-no)" }}>Wymagane co najmniej {min}</span>}
      </div>

      <button className="legacy-btn legacy-btn-primary legacy-btn-lg" style={{ width: "100%", marginTop: 16 }} disabled={pending || tooFew} onClick={onCast}>
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
  const send = () => onCast(Object.entries(choices).map(([optionId, choice]) => ({ optionId, choice })));

  const CHOICE_META: { key: VoteChoice; label: string; color: string; bg: string }[] = [
    { key: "YES", label: "ZA", color: "var(--color-yes)", bg: "var(--color-yes-bg)" },
    { key: "NO", label: "PRZECIW", color: "var(--color-no)", bg: "var(--color-no-bg)" },
    { key: "ABSTAIN", label: "WSTRZYMUJĘ SIĘ", color: "var(--color-abstain)", bg: "var(--color-abstain-bg)" },
  ];

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {options.map((o, idx) => (
          <div
            key={o.id}
            style={{ paddingBottom: 12, borderBottom: idx < options.length - 1 ? "1px solid var(--color-rule-soft)" : "none" }}
          >
            <div style={{ marginBottom: 8, fontWeight: 600 }}>{idx + 1}. {o.label}</div>
            {o.description && <div style={{ fontSize: 14, marginBottom: 8, color: "var(--color-ink-2)" }}>{o.description}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {CHOICE_META.map((m) => {
                const active = choices[o.id] === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    disabled={pending}
                    onClick={() => set(o.id, m.key)}
                    className="legacy-btn"
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

      <button className="legacy-btn legacy-btn-primary legacy-btn-lg" style={{ width: "100%", marginTop: 20 }} disabled={pending || !canSend} onClick={send}>
        {pending ? "Wysyłam…" : alreadyVoted ? "Aktualizuj głosy" : "Zatwierdź i wyślij głosy"}
      </button>
      {!canSend && (
        <p style={{ fontSize: 12, marginTop: 8, textAlign: "center", color: "var(--color-ink-3)" }}>
          Oddaj głos na wszystkie pozycje ({answered}/{options.length}).
        </p>
      )}
      {secret && (
        <p style={{ fontSize: 12, marginTop: 8, textAlign: "center", color: "var(--color-ink-3)" }}>
          Głosowanie tajne - wybór nie jest nigdzie zapisywany z powiązaniem do Twojego konta.
        </p>
      )}
    </div>
  );
}
