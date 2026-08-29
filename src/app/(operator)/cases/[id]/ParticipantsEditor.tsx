"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Participant = { id: string; userId: string; hasVotingRight: boolean; firstName: string; lastName: string; active: boolean };
type UserOpt = { id: string; firstName: string; lastName: string; email: string };
type BodyOpt = { id: string; name: string };

export function ParticipantsEditor({
  caseId, editable, bodies, users, participants,
}: {
  caseId: string; editable: boolean; bodies: BodyOpt[]; users: UserOpt[]; participants: Participant[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [bodyId, setBodyId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addedIds = useMemo(() => new Set(participants.map((p) => p.userId)), [participants]);
  const available = users.filter((u) => !addedIds.has(u.id));

  function refresh() { router.refresh(); }

  function addFromBody() {
    if (!bodyId) return;
    setError(null);
    startTransition(async () => {
      const r = await fetch(`/api/cases/${caseId}/participants`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bodyId }),
      });
      if (r.ok) { setBodyId(""); refresh(); } else setError(await r.text());
    });
  }

  function addManual() {
    if (selectedUserIds.length === 0) return;
    setError(null);
    startTransition(async () => {
      const r = await fetch(`/api/cases/${caseId}/participants`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: selectedUserIds }),
      });
      if (r.ok) { setSelectedUserIds([]); refresh(); } else setError(await r.text());
    });
  }

  function toggleRight(p: Participant) {
    startTransition(async () => {
      await fetch(`/api/cases/${caseId}/participants/${p.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hasVotingRight: !p.hasVotingRight }),
      });
      refresh();
    });
  }

  function remove(p: Participant) {
    startTransition(async () => {
      await fetch(`/api/cases/${caseId}/participants/${p.id}`, { method: "DELETE" });
      refresh();
    });
  }

  return (
    <div className="d-flex flex-column gap-4">
      {participants.length === 0 ? (
        <p className="small text-secondary-emphasis mb-0">Skład jest pusty.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr className="text-secondary-emphasis">
                <th className="fw-normal">Osoba</th>
                <th className="fw-normal">Prawo głosu</th>
                {editable && <th className="fw-normal"></th>}
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id}>
                  <td>{p.lastName} {p.firstName}{!p.active && <span className="ms-2 badge text-bg-light border">nieaktywne konto</span>}</td>
                  <td>
                    {editable ? (
                      <div className="form-check mb-0">
                        <input type="checkbox" className="form-check-input" id={`vote-${p.id}`} checked={p.hasVotingRight} disabled={pending} onChange={() => toggleRight(p)} />
                        <label className="form-check-label" htmlFor={`vote-${p.id}`}>{p.hasVotingRight ? "Tak" : "Nie"}</label>
                      </div>
                    ) : (p.hasVotingRight ? "Tak" : "Nie")}
                  </td>
                  {editable && (
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-danger" disabled={pending} onClick={() => remove(p)}>Usuń</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editable && (
        <div className="card card-soft p-4 d-flex flex-column gap-3">
          <div className="eyebrow">Dodaj do składu</div>
          {bodies.length > 0 && (
            <div className="d-flex gap-2 align-items-end">
              <div className="flex-grow-1">
                <label className="form-label eyebrow">Cały skład organu</label>
                <select className="form-select" value={bodyId} onChange={(e) => setBodyId(e.target.value)}>
                  <option value="">- wybierz organ -</option>
                  {bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <button className="btn btn-sm btn-outline-secondary" disabled={!bodyId || pending} onClick={addFromBody}>Dodaj skład</button>
            </div>
          )}
          <div className="d-flex gap-2 align-items-end">
            <div className="flex-grow-1">
              <label className="form-label eyebrow">Osoby pojedynczo</label>
              <select multiple className="form-select" style={{ height: 120 }} value={selectedUserIds}
                onChange={(e) => setSelectedUserIds(Array.from(e.target.selectedOptions).map((o) => o.value))}>
                {available.map((u) => <option key={u.id} value={u.id}>{u.lastName} {u.firstName} ({u.email})</option>)}
              </select>
            </div>
            <button className="btn btn-sm btn-outline-secondary" disabled={selectedUserIds.length === 0 || pending} onClick={addManual}>Dodaj zaznaczone</button>
          </div>
          {error && <div className="alert alert-danger py-2 mb-0">{error}</div>}
        </div>
      )}
    </div>
  );
}
