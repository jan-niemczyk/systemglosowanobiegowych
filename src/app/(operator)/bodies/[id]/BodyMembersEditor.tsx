"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { readApiError } from "@/lib/apiError";

type Member = { userId: string; hasVotingRight: boolean; firstName: string; lastName: string; email: string };
type UserOpt = { id: string; firstName: string; lastName: string; email: string };

export function BodyMembersEditor({ bodyId, members, users }: { bodyId: string; members: Member[]; users: UserOpt[] }) {
  const router = useRouter();
  const toast = useToast();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const addedIds = useMemo(() => new Set(members.map((m) => m.userId)), [members]);
  const available = users.filter((u) => !addedIds.has(u.id));

  function add() {
    if (selectedUserIds.length === 0) return;
    startTransition(async () => {
      const r = await fetch(`/api/bodies/${bodyId}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: selectedUserIds }),
      });
      if (r.ok) { toast.success("Wybrane osoby zostały dodane do składu organu."); setSelectedUserIds([]); router.refresh(); }
      else toast.error(await readApiError(r));
    });
  }

  function toggleRight(m: Member) {
    startTransition(async () => {
      const r = await fetch(`/api/bodies/${bodyId}/members/${m.userId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hasVotingRight: !m.hasVotingRight }),
      });
      if (r.ok) { toast.success("Prawo głosu zostało zaktualizowane."); router.refresh(); }
      else toast.error(await readApiError(r));
    });
  }

  function remove(m: Member) {
    startTransition(async () => {
      const r = await fetch(`/api/bodies/${bodyId}/members/${m.userId}`, { method: "DELETE" });
      if (r.ok) { toast.success("Osoba została usunięta ze składu organu."); router.refresh(); }
      else toast.error(await readApiError(r));
    });
  }

  return (
    <div className="d-flex flex-column gap-4">
      {members.length === 0 ? (
        <p className="small text-secondary-emphasis mb-0">Skład jest pusty.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr className="text-secondary-emphasis">
                <th className="fw-normal">Osoba</th>
                <th className="fw-normal">Prawo głosu</th>
                <th className="fw-normal"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.userId}>
                  <td>{m.lastName} {m.firstName}</td>
                  <td>
                    <div className="form-check mb-0">
                      <input type="checkbox" className="form-check-input" id={`member-vote-${m.userId}`} checked={m.hasVotingRight} disabled={pending} onChange={() => toggleRight(m)} />
                      <label className="form-check-label" htmlFor={`member-vote-${m.userId}`}>{m.hasVotingRight ? "Tak" : "Nie"}</label>
                    </div>
                  </td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-danger" disabled={pending} onClick={() => remove(m)}>Usuń</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card card-soft p-4 d-flex flex-row gap-2 align-items-end">
        <div className="flex-grow-1">
          <label className="form-label eyebrow">Dodaj osoby</label>
          <select multiple className="form-select" style={{ height: 120 }} value={selectedUserIds}
            onChange={(e) => setSelectedUserIds(Array.from(e.target.selectedOptions).map((o) => o.value))}>
            {available.map((u) => <option key={u.id} value={u.id}>{u.lastName} {u.firstName} ({u.email})</option>)}
          </select>
        </div>
        <button className="btn btn-sm btn-outline-secondary" disabled={selectedUserIds.length === 0 || pending} onClick={add}>Dodaj zaznaczone</button>
      </div>
    </div>
  );
}
