"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CloseMode, ResultsVisibility, Settings } from "@prisma/client";
import { CLOSE_MODE_LABEL, RESULTS_VISIBILITY_LABEL } from "@/lib/labels";

export function NewCaseForm({ bodies, settings }: { bodies: { id: string; name: string }[]; settings: Settings }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [description, setDescription] = useState("");
  const [bodyId, setBodyId] = useState("");
  const [closeMode, setCloseMode] = useState<CloseMode>(settings.defaultCloseMode);
  const [resultsVisibility, setResultsVisibility] = useState<ResultsVisibility>(settings.defaultResultsVisibility);
  const [allowVoteChange, setAllowVoteChange] = useState(settings.defaultAllowVoteChange);
  const [deadlineAt, setDeadlineAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, number: number || null, description: description || null,
          bodyId: bodyId || null, closeMode, resultsVisibility, allowVoteChange,
          deadlineAt: deadlineAt || null,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        router.push(`/cases/${d.id}`);
      } else {
        setError(await r.text());
      }
    });
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div>
        <label className="label">Tytuł sprawy</label>
        <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="np. Uchwała w sprawie budżetu na 2027 rok" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Numer sprawy (opcjonalnie)</label>
          <input className="input" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="np. 12/2026" />
        </div>
        <div>
          <label className="label">Organ / zespół</label>
          <select className="input" value={bodyId} onChange={(e) => setBodyId(e.target.value)}>
            <option value="">- bez przypisania -</option>
            {bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Opis</label>
        <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="border-t pt-4 space-y-4" style={{ borderColor: "var(--color-rule-soft)" }}>
        <div className="eyebrow">Konfiguracja sprawy</div>
        <div>
          <label className="label">Tryb zakończenia</label>
          <select className="input" value={closeMode} onChange={(e) => setCloseMode(e.target.value as CloseMode)}>
            {Object.entries(CLOSE_MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {(closeMode === "DEADLINE" || closeMode === "DEADLINE_OR_ALL_VOTED") && (
          <div>
            <label className="label">Termin końcowy</label>
            <input type="datetime-local" className="input" value={deadlineAt} onChange={(e) => setDeadlineAt(e.target.value)} required />
          </div>
        )}
        <div>
          <label className="label">Publikacja wyników</label>
          <select className="input" value={resultsVisibility} onChange={(e) => setResultsVisibility(e.target.value as ResultsVisibility)}>
            {Object.entries(RESULTS_VISIBILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allowVoteChange} onChange={(e) => setAllowVoteChange(e.target.checked)} />
          Dopuszczalna zmiana głosu do zamknięcia sprawy (nie dotyczy głosowań tajnych)
        </label>
      </div>

      {error && <div className="text-sm" style={{ color: "var(--color-no)" }}>{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Tworzenie…" : "Utwórz projekt sprawy"}</button>
    </form>
  );
}
