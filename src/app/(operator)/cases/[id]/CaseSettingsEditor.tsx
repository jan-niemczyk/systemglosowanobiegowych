"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CaseStatus, CloseMode, ResultsVisibility } from "@prisma/client";
import { CLOSE_MODE_LABEL, RESULTS_VISIBILITY_LABEL, formatDateTime } from "@/lib/labels";
import { StatusPill } from "@/components/StatusPill";
import { useToast } from "@/components/Toast";
import { readApiError } from "@/lib/apiError";

function toDatetimeLocalWarsaw(d: Date | null): string {
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

const FULL_EDIT_STATUSES = new Set<CaseStatus>(["DRAFT", "OPEN"]);
const RESTRICTED_EDIT_STATUSES = new Set<CaseStatus>(["CLOSED", "RESULTS_PUBLISHED"]);

export function CaseSettingsEditor({
  caseId, status, title, number, description, bodyId, bodyName, bodies,
  closeMode, resultsVisibility, allowVoteChange, deadlineAt, openedAt, closedAt, children,
}: {
  caseId: string;
  status: CaseStatus;
  title: string;
  number: string | null;
  description: string | null;
  bodyId: string | null;
  bodyName: string | null;
  bodies: { id: string; name: string }[];
  closeMode: CloseMode;
  resultsVisibility: ResultsVisibility;
  allowVoteChange: boolean;
  deadlineAt: Date | null;
  openedAt: Date | null;
  closedAt: Date | null;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const [titleValue, setTitleValue] = useState(title);
  const [numberValue, setNumberValue] = useState(number ?? "");
  const [descriptionValue, setDescriptionValue] = useState(description ?? "");
  const [bodyIdValue, setBodyIdValue] = useState(bodyId ?? "");
  const [closeModeValue, setCloseModeValue] = useState<CloseMode>(closeMode);
  const [resultsVisibilityValue, setResultsVisibilityValue] = useState<ResultsVisibility>(resultsVisibility);
  const [allowVoteChangeValue, setAllowVoteChangeValue] = useState(allowVoteChange);
  const [deadlineAtValue, setDeadlineAtValue] = useState(toDatetimeLocalWarsaw(deadlineAt));

  const fullEdit = FULL_EDIT_STATUSES.has(status);
  const canEdit = fullEdit || RESTRICTED_EDIT_STATUSES.has(status);

  function resetForm() {
    setTitleValue(title);
    setNumberValue(number ?? "");
    setDescriptionValue(description ?? "");
    setBodyIdValue(bodyId ?? "");
    setCloseModeValue(closeMode);
    setResultsVisibilityValue(resultsVisibility);
    setAllowVoteChangeValue(allowVoteChange);
    setDeadlineAtValue(toDatetimeLocalWarsaw(deadlineAt));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const body: Record<string, unknown> = {
        title: titleValue,
        bodyId: bodyIdValue || null,
      };
      if (fullEdit) {
        body.number = numberValue || null;
        body.description = descriptionValue || null;
        body.closeMode = closeModeValue;
        body.resultsVisibility = resultsVisibilityValue;
        body.allowVoteChange = allowVoteChangeValue;
        body.deadlineAt = deadlineAtValue || null;
      }
      const r = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) { toast.success("Ustawienia sprawy zostały zapisane."); setEditing(false); router.refresh(); }
      else toast.error(await readApiError(r));
    });
  }

  if (editing) {
    return (
      <form onSubmit={save} className="card shadow-sm p-4 d-flex flex-column gap-3">
        <div>
          <label className="form-label eyebrow">Tytuł sprawy</label>
          <input className="form-control" required value={titleValue} onChange={(e) => setTitleValue(e.target.value)} />
        </div>
        <div className="row g-3">
          {fullEdit && (
            <div className="col-12 col-sm-6">
              <label className="form-label eyebrow">Numer sprawy (opcjonalnie)</label>
              <input className="form-control" value={numberValue} onChange={(e) => setNumberValue(e.target.value)} />
            </div>
          )}
          <div className={fullEdit ? "col-12 col-sm-6" : "col-12"}>
            <label className="form-label eyebrow">Organ / zespół</label>
            <select className="form-select" value={bodyIdValue} onChange={(e) => setBodyIdValue(e.target.value)}>
              <option value="">- bez przypisania -</option>
              {bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        {fullEdit && (
          <>
            <div>
              <label className="form-label eyebrow">Opis</label>
              <textarea className="form-control" rows={3} value={descriptionValue} onChange={(e) => setDescriptionValue(e.target.value)} />
            </div>
            <div className="border-top pt-4 d-flex flex-column gap-3">
              <div className="eyebrow">Konfiguracja sprawy</div>
              <div>
                <label className="form-label eyebrow">Tryb zakończenia</label>
                <select className="form-select" value={closeModeValue} onChange={(e) => setCloseModeValue(e.target.value as CloseMode)}>
                  {Object.entries(CLOSE_MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {(closeModeValue === "DEADLINE" || closeModeValue === "DEADLINE_OR_ALL_VOTED") && (
                <div>
                  <label className="form-label eyebrow">Termin końcowy</label>
                  <input type="datetime-local" className="form-control" value={deadlineAtValue} onChange={(e) => setDeadlineAtValue(e.target.value)} required />
                </div>
              )}
              <div>
                <label className="form-label eyebrow">Publikacja wyników</label>
                <select className="form-select" value={resultsVisibilityValue} onChange={(e) => setResultsVisibilityValue(e.target.value as ResultsVisibility)}>
                  {Object.entries(RESULTS_VISIBILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="form-check">
                <input type="checkbox" className="form-check-input" id="allowVoteChangeEdit" checked={allowVoteChangeValue} onChange={(e) => setAllowVoteChangeValue(e.target.checked)} />
                <label className="form-check-label small" htmlFor="allowVoteChangeEdit">
                  Dopuszczalna zmiana głosu do zamknięcia sprawy (nie dotyczy głosowań tajnych)
                </label>
              </div>
            </div>
          </>
        )}

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz"}</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={pending} onClick={() => { setEditing(false); resetForm(); }}>Anuluj</button>
        </div>
      </form>
    );
  }

  return (
    <div className="d-flex flex-column gap-4">
      <header className="d-flex align-items-start justify-content-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow mb-2">Sprawa {number ? `nr ${number}` : ""}</div>
          <h1 className="h3">{title}</h1>
          {description && <p className="small mt-2 text-secondary-emphasis" style={{ maxWidth: 560 }}>{description}</p>}
          <div className="d-flex align-items-center gap-3 mt-3">
            <StatusPill status={status} />
            {bodyName && <span className="small text-secondary-emphasis">{bodyName}</span>}
          </div>
        </div>
        <div className="d-flex gap-2 align-items-start">
          {canEdit && (
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(true)}>Edytuj</button>
          )}
          {children}
        </div>
      </header>

      <section className="card card-soft shadow-sm p-4">
        <div className="row row-cols-1 row-cols-sm-2 g-3 small">
          <Info label="Tryb zakończenia" value={CLOSE_MODE_LABEL[closeMode]} />
          <Info label="Publikacja wyników" value={RESULTS_VISIBILITY_LABEL[resultsVisibility]} />
          <Info label="Zmiana głosu" value={allowVoteChange ? "Dopuszczalna (jawne, do zamknięcia)" : "Niedopuszczalna"} />
          <Info label="Termin końcowy" value={formatDateTime(deadlineAt)} />
          <Info label="Otwarto" value={formatDateTime(openedAt)} />
          <Info label="Zamknięto" value={formatDateTime(closedAt)} />
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div>{value}</div>
    </div>
  );
}
