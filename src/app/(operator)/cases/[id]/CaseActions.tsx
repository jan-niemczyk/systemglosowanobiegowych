"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CaseStatus } from "@prisma/client";

export function CaseActions({
  caseId, status, readiness,
}: {
  caseId: string;
  status: CaseStatus;
  readiness: { hasParticipants: boolean; hasItems: boolean };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);

  function call(path: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setErrors([]);
    startTransition(async () => {
      const r = await fetch(`/api/cases/${caseId}${path}`, { method: "POST" });
      if (r.ok) {
        router.refresh();
      } else {
        const d = await r.json().catch(() => null);
        setErrors(d?.errors ?? [await r.text()]);
      }
    });
  }

  function remove() {
    const msg = status === "DRAFT"
      ? "Usunąć projekt sprawy? Tej operacji nie można cofnąć."
      : "Usunąć sprawę? To BEZPOWROTNIE skasuje wszystkie oddane głosy, skład uprawnionych i dokumenty. Tej operacji nie można cofnąć.";
    if (!confirm(msg)) return;
    startTransition(async () => {
      const r = await fetch(`/api/cases/${caseId}`, { method: "DELETE" });
      if (r.ok) router.push("/cases");
      else setErrors([await r.text()]);
    });
  }

  const canOpen = readiness.hasParticipants && readiness.hasItems;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        {status === "DRAFT" && (
          <>
            <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => call("/cancel", "Anulować sprawę?")}>Anuluj</button>
            <button className="btn btn-primary" disabled={pending || !canOpen} onClick={() => call("/open")}>Otwórz sprawę</button>
          </>
        )}
        {status === "OPEN" && (
          <>
            <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => call("/cancel", "Anulować otwartą sprawę?")}>Anuluj</button>
            <button className="btn btn-primary" disabled={pending} onClick={() => call("/close", "Zamknąć głosowanie ręcznie? Tej operacji nie można cofnąć.")}>Zamknij sprawę</button>
          </>
        )}
        {status === "CLOSED" && (
          <button className="btn btn-primary" disabled={pending} onClick={() => call("/publish-results")}>Opublikuj wyniki</button>
        )}
        <button className="btn btn-danger btn-sm" disabled={pending} onClick={remove}>
          {status === "DRAFT" ? "Usuń projekt" : "Usuń sprawę"}
        </button>
      </div>
      {errors.length > 0 && (
        <div className="text-sm text-right" style={{ color: "var(--color-no)" }}>
          {errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}
    </div>
  );
}
