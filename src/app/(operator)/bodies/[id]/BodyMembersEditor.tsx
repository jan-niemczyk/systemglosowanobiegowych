"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Member = { userId: string; hasVotingRight: boolean; firstName: string; lastName: string; email: string };
type UserOpt = { id: string; firstName: string; lastName: string; email: string };

export function BodyMembersEditor({ bodyId, members, users }: { bodyId: string; members: Member[]; users: UserOpt[] }) {
  const router = useRouter();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const addedIds = useMemo(() => new Set(members.map((m) => m.userId)), [members]);
  const available = users.filter((u) => !addedIds.has(u.id));

  function add() {
    if (selectedUserIds.length === 0) return;
    startTransition(async () => {
      await fetch(`/api/bodies/${bodyId}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: selectedUserIds }),
      });
      setSelectedUserIds([]);
      router.refresh();
    });
  }

  function toggleRight(m: Member) {
    startTransition(async () => {
      await fetch(`/api/bodies/${bodyId}/members/${m.userId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hasVotingRight: !m.hasVotingRight }),
      });
      router.refresh();
    });
  }

  function remove(m: Member) {
    startTransition(async () => {
      await fetch(`/api/bodies/${bodyId}/members/${m.userId}`, { method: "DELETE" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>Skład jest pusty.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left" style={{ color: "var(--color-ink-3)" }}>
              <th className="pb-1 font-normal">Osoba</th>
              <th className="pb-1 font-normal">Prawo głosu</th>
              <th className="pb-1 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-t" style={{ borderColor: "var(--color-rule-soft)" }}>
                <td className="py-1">{m.lastName} {m.firstName}</td>
                <td className="py-1">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={m.hasVotingRight} disabled={pending} onChange={() => toggleRight(m)} />
                    {m.hasVotingRight ? "Tak" : "Nie"}
                  </label>
                </td>
                <td className="py-1 text-right">
                  <button className="btn btn-sm btn-danger" disabled={pending} onClick={() => remove(m)}>Usuń</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="card-soft p-4 flex gap-2 items-end">
        <div className="flex-1">
          <label className="label">Dodaj osoby</label>
          <select multiple className="input" style={{ height: 120 }} value={selectedUserIds}
            onChange={(e) => setSelectedUserIds(Array.from(e.target.selectedOptions).map((o) => o.value))}>
            {available.map((u) => <option key={u.id} value={u.id}>{u.lastName} {u.firstName} ({u.email})</option>)}
          </select>
        </div>
        <button className="btn btn-sm" disabled={selectedUserIds.length === 0 || pending} onClick={add}>Dodaj zaznaczone</button>
      </div>
    </div>
  );
}
