"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CaseStatus } from "@prisma/client";
import { useToast } from "@/components/Toast";
import { readApiError } from "@/lib/apiError";

export function CaseActions({
  caseId, status, readiness,
}: {
  caseId: string;
  status: CaseStatus;
  readiness: { hasParticipants: boolean; hasItems: boolean };
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function call(path: string, successMsg: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    startTransition(async () => {
      const r = await fetch(`/api/cases/${caseId}${path}`, { method: "POST" });
      if (r.ok) {
        toast.success(successMsg);
        router.refresh();
      } else {
        toast.error(await readApiError(r));
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
      if (r.ok) {
        toast.success(status === "DRAFT" ? "Projekt sprawy został usunięty." : "Sprawa została usunięta.");
        router.push("/cases");
      } else {
        toast.error(await readApiError(r));
      }
    });
  }

  const canOpen = readiness.hasParticipants && readiness.hasItems;

  return (
    <div className="d-flex gap-2">
      {status === "DRAFT" && (
        <>
          <button className="btn btn-outline-danger btn-sm" disabled={pending} onClick={() => call("/cancel", "Sprawa została anulowana.", "Anulować sprawę?")}>Anuluj</button>
          <button className="btn btn-primary" disabled={pending || !canOpen} onClick={() => call("/open", "Sprawa została otwarta.")}>Otwórz sprawę</button>
        </>
      )}
      {status === "OPEN" && (
        <>
          <button className="btn btn-outline-danger btn-sm" disabled={pending} onClick={() => call("/cancel", "Sprawa została anulowana.", "Anulować otwartą sprawę?")}>Anuluj</button>
          <button className="btn btn-primary" disabled={pending} onClick={() => call("/close", "Sprawa została zamknięta.", "Zamknąć głosowanie ręcznie? Tej operacji nie można cofnąć.")}>Zamknij sprawę</button>
        </>
      )}
      {status === "CLOSED" && (
        <button className="btn btn-primary" disabled={pending} onClick={() => call("/publish-results", "Wyniki zostały opublikowane.")}>Opublikuj wyniki</button>
      )}
      <button className="btn btn-outline-danger btn-sm" disabled={pending} onClick={remove}>
        {status === "DRAFT" ? "Usuń projekt" : "Usuń sprawę"}
      </button>
    </div>
  );
}
