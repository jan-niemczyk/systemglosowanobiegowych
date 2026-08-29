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
    <div className="card shadow-sm border border-2 slide-in" style={{ borderColor: "var(--bs-live)" }}>
      <div className="card-header bg-danger-subtle" style={{ borderBottomColor: "var(--bs-live)" }}>
        <span className="badge badge-live">Trwa głosowanie - {secret ? "tajne" : "jawne"}</span>
      </div>
      <div className="card-body">
        <h2 className="h4 mb-2">{item.order}. {item.title}</h2>
        {item.description && <p className="small text-secondary-emphasis mb-4">{item.description}</p>}

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

        {error && <div className="alert alert-danger mt-4 mb-0">{error}</div>}

        {alreadyVoted && !secret && item.type === "STANDARD" && myChoice && (
          <div className={`alert text-center mt-4 mb-0 ${myChoice === "YES" ? "alert-vote-yes" : myChoice === "NO" ? "alert-vote-no" : "alert-vote-abstain"}`}>
            <div className="eyebrow">Twój głos</div>
            <div className="fs-5 fw-medium">
              {myChoice === "YES" ? "ZA" : myChoice === "NO" ? "PRZECIW" : "WSTRZYMAŁEŚ SIĘ"}
            </div>
            <p className="small mb-0 mt-1">
              {locked ? "Głos jest ostateczny - nie można go zmienić." : "Możesz zmienić swój głos do czasu zamknięcia sprawy."}
            </p>
          </div>
        )}

        {alreadyVoted && !secret && (isList || item.type === "PACKAGE") && (
          <div className="alert alert-vote-yes text-center mt-4 mb-0">
            <div className="eyebrow">Twój głos</div>
            <div className="fs-5 fw-medium">Głos został oddany</div>
            <p className="small mb-0 mt-1">
              {locked ? "Głos jest ostateczny - nie można go zmienić." : "Możesz zmienić swój wybór do czasu zamknięcia sprawy."}
            </p>
          </div>
        )}

        {alreadyVoted && secret && (
          <div className="alert alert-secondary text-center mt-4 mb-0">
            <div className="eyebrow">Głosowanie tajne</div>
            <div className="fs-5 fw-medium">Twój głos został oddany</div>
            <p className="small mb-0 mt-1">Wybór pozostaje anonimowy i nie jest nigdzie zapisywany.</p>
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
    { choice: "YES", label: "Za", cls: "btn-vote-yes" },
    { choice: "NO", label: "Przeciw", cls: "btn-vote-no" },
    { choice: "ABSTAIN", label: "Wstrzymuję się", cls: "btn-vote-abstain" },
  ];
  return (
    <div className="d-grid gap-2">
      {buttons.map((b) => {
        // W głosowaniu TAJNYM nigdy nie pokazujemy który przycisk został wybrany.
        const isMine = !secret && myChoice === b.choice;
        return (
          <button
            key={b.choice}
            type="button"
            disabled={pending}
            onClick={() => onCast(b.choice)}
            className={`btn btn-lg ${b.cls}`}
            style={{ outline: isMine ? "3px solid var(--bs-dark)" : undefined, outlineOffset: 2, opacity: pending ? 0.7 : 1 }}
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
      <p className="small text-secondary-emphasis mb-3">
        Wybierz {min === max ? `dokładnie ${min}` : `od ${min} do ${max}`} opcji. <strong>Niezaznaczenie = głos przeciw danemu kandydatowi.</strong>
      </p>
      <div className="list-group">
        {options.map((o, i) => {
          const checked = selectedIds.includes(o.id);
          const disabled = !checked && selectedIds.length >= max;
          return (
            <label
              key={o.id}
              className={`list-group-item list-group-item-action d-flex align-items-center gap-3${checked ? " list-group-item-vote-yes" : ""}${disabled ? " disabled" : ""}`}
              style={{ cursor: disabled ? "default" : "pointer" }}
            >
              <input
                type="checkbox"
                className="form-check-input mt-0 flex-shrink-0"
                style={{ width: 20, height: 20 }}
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(o.id)}
              />
              <span className="num small text-secondary-emphasis" style={{ width: 24 }}>{i + 1}.</span>
              <span className="flex-grow-1">{o.label}</span>
              <span className={`badge ${checked ? "badge-vote-yes" : "badge-vote-no"}`}>{checked ? "ZA" : "PRZECIW"}</span>
            </label>
          );
        })}
      </div>

      <div className="d-flex align-items-center justify-content-between mt-3 small text-secondary-emphasis">
        <span>
          Zaznaczono: <span className="num">{selectedIds.length}</span> / {max}
          {remaining > 0 && ` (pozostało ${remaining})`}
        </span>
        {tooFew && <span className="text-vote-no">Wymagane co najmniej {min}</span>}
      </div>

      <button type="button" className="btn btn-primary btn-lg w-100 mt-3" disabled={pending || tooFew} onClick={onCast}>
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

  const CHOICE_META: { key: VoteChoice; label: string; cls: string }[] = [
    { key: "YES", label: "ZA", cls: "vote-yes" },
    { key: "NO", label: "PRZECIW", cls: "vote-no" },
    { key: "ABSTAIN", label: "WSTRZYMUJĘ SIĘ", cls: "vote-abstain" },
  ];

  return (
    <div>
      <div className="d-flex flex-column gap-4">
        {options.map((o, idx) => (
          <div key={o.id} className={idx < options.length - 1 ? "pb-3 border-bottom" : undefined}>
            <div className="fw-semibold mb-1">{idx + 1}. {o.label}</div>
            {o.description && <div className="small text-secondary-emphasis mb-2">{o.description}</div>}
            <div className="row row-cols-3 g-2">
              {CHOICE_META.map((m) => {
                const active = choices[o.id] === m.key;
                return (
                  <div className="col" key={m.key}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => set(o.id, m.key)}
                      className={`btn w-100 fw-semibold ${active ? `btn-${m.cls}` : `btn-outline-${m.cls}`}`}
                    >
                      {m.label}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-primary btn-lg w-100 mt-4" disabled={pending || !canSend} onClick={send}>
        {pending ? "Wysyłam…" : alreadyVoted ? "Aktualizuj głosy" : "Zatwierdź i wyślij głosy"}
      </button>
      {!canSend && (
        <p className="small text-secondary-emphasis text-center mt-2 mb-0">
          Oddaj głos na wszystkie pozycje ({answered}/{options.length}).
        </p>
      )}
      {secret && (
        <p className="small text-secondary-emphasis text-center mt-2 mb-0">
          Głosowanie tajne - wybór nie jest nigdzie zapisywany z powiązaniem do Twojego konta.
        </p>
      )}
    </div>
  );
}
