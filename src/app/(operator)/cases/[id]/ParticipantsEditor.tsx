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
    <div className="space-y-4">
      {participants.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>Skład jest pusty.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left" style={{ color: "var(--color-ink-3)" }}>
              <th className="pb-1 font-normal">Osoba</th>
              <th className="pb-1 font-normal">Prawo głosu</th>
              {editable && <th className="pb-1 font-normal"></th>}
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.id} className="border-t" style={{ borderColor: "var(--color-rule-soft)" }}>
                <td className="py-1">{p.lastName} {p.firstName}{!p.active && <span className="ml-2 pill pill-neutral">nieaktywne konto</span>}</td>
                <td className="py-1">
                  {editable ? (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={p.hasVotingRight} disabled={pending} onChange={() => toggleRight(p)} />
                      {p.hasVotingRight ? "Tak" : "Nie"}
                    </label>
                  ) : (p.hasVotingRight ? "Tak" : "Nie")}
                </td>
                {editable && (
                  <td className="py-1 text-right">
                    <button className="btn btn-sm btn-danger" disabled={pending} onClick={() => remove(p)}>Usuń</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editable && (
        <div className="card-soft p-4 space-y-3">
          <div className="eyebrow">Dodaj do składu</div>
          {bodies.length > 0 && (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="label">Cały skład organu</label>
                <select className="input" value={bodyId} onChange={(e) => setBodyId(e.target.value)}>
                  <option value="">- wybierz organ -</option>
                  {bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <button className="btn btn-sm" disabled={!bodyId || pending} onClick={addFromBody}>Dodaj skład</button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="label">Osoby pojedynczo</label>
              <select multiple className="input" style={{ height: 120 }} value={selectedUserIds}
                onChange={(e) => setSelectedUserIds(Array.from(e.target.selectedOptions).map((o) => o.value))}>
                {available.map((u) => <option key={u.id} value={u.id}>{u.lastName} {u.firstName} ({u.email})</option>)}
              </select>
            </div>
            <button className="btn btn-sm" disabled={selectedUserIds.length === 0 || pending} onClick={addManual}>Dodaj zaznaczone</button>
          </div>
          {error && <div className="text-sm" style={{ color: "var(--color-no)" }}>{error}</div>}
        </div>
      )}
    </div>
  );
}
