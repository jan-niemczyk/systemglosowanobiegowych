"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CloseMode, ResultsVisibility, Settings } from "@prisma/client";
import { CLOSE_MODE_LABEL, RESULTS_VISIBILITY_LABEL } from "@/lib/labels";
import { useToast } from "@/components/Toast";
import { readApiError } from "@/lib/apiError";

export function NewCaseForm({ bodies, settings }: { bodies: { id: string; name: string }[]; settings: Settings }) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [description, setDescription] = useState("");
  const [bodyId, setBodyId] = useState("");
  const [closeMode, setCloseMode] = useState<CloseMode>(settings.defaultCloseMode);
  const [resultsVisibility, setResultsVisibility] = useState<ResultsVisibility>(settings.defaultResultsVisibility);
  const [allowVoteChange, setAllowVoteChange] = useState(settings.defaultAllowVoteChange);
  const [deadlineAt, setDeadlineAt] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
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
        toast.success("Projekt sprawy został utworzony.");
        router.push(`/cases/${d.id}`);
      } else {
        toast.error(await readApiError(r));
      }
    });
  }

  return (
    <form onSubmit={submit} className="card shadow-sm p-4 d-flex flex-column gap-3">
      <div>
        <label className="form-label eyebrow">Tytuł sprawy</label>
        <input className="form-control" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="np. Uchwała w sprawie budżetu na 2027 rok" />
      </div>
      <div className="row g-3">
        <div className="col-12 col-sm-6">
          <label className="form-label eyebrow">Numer sprawy (opcjonalnie)</label>
          <input className="form-control" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="np. 12/2026" />
        </div>
        <div className="col-12 col-sm-6">
          <label className="form-label eyebrow">Organ / zespół</label>
          <select className="form-select" value={bodyId} onChange={(e) => setBodyId(e.target.value)}>
            <option value="">- bez przypisania -</option>
            {bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="form-label eyebrow">Opis</label>
        <textarea className="form-control" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="border-top pt-4 d-flex flex-column gap-3">
        <div className="eyebrow">Konfiguracja sprawy</div>
        <div>
          <label className="form-label eyebrow">Tryb zakończenia</label>
          <select className="form-select" value={closeMode} onChange={(e) => setCloseMode(e.target.value as CloseMode)}>
            {Object.entries(CLOSE_MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {(closeMode === "DEADLINE" || closeMode === "DEADLINE_OR_ALL_VOTED") && (
          <div>
            <label className="form-label eyebrow">Termin końcowy</label>
            <input type="datetime-local" className="form-control" value={deadlineAt} onChange={(e) => setDeadlineAt(e.target.value)} required />
          </div>
        )}
        <div>
          <label className="form-label eyebrow">Publikacja wyników</label>
          <select className="form-select" value={resultsVisibility} onChange={(e) => setResultsVisibility(e.target.value as ResultsVisibility)}>
            {Object.entries(RESULTS_VISIBILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="form-check">
          <input type="checkbox" className="form-check-input" id="allowVoteChange" checked={allowVoteChange} onChange={(e) => setAllowVoteChange(e.target.checked)} />
          <label className="form-check-label small" htmlFor="allowVoteChange">
            Dopuszczalna zmiana głosu do zamknięcia sprawy (nie dotyczy głosowań tajnych)
          </label>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Tworzenie…" : "Utwórz projekt sprawy"}</button>
    </form>
  );
}
