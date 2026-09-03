"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { readApiError } from "@/lib/apiError";

/** Wpisywana przez operatora po zamknięciu sprawy treść rozstrzygnięcia - drukowana w Protokole, niewidoczna dla uczestników. */
export function ResolutionEditor({
  caseId, itemId, resolution,
}: {
  caseId: string;
  itemId: string;
  resolution: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(resolution ?? "");
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await fetch(`/api/cases/${caseId}/items/${itemId}/resolution`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: value || null }),
      });
      if (r.ok) { toast.success("Rozstrzygnięcie zostało zapisane."); router.refresh(); }
      else toast.error(await readApiError(r));
    });
  }

  return (
    <form onSubmit={save} className="card card-soft p-3 d-flex flex-column gap-2">
      <label className="eyebrow" htmlFor={`resolution-${itemId}`}>Rozstrzygnięcie (do Protokołu)</label>
      <textarea
        id={`resolution-${itemId}`}
        className="form-control"
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Treść widoczna wyłącznie w drukowanym Protokole - nie jest pokazywana uczestnikom."
      />
      <div>
        <button type="submit" className="btn btn-sm btn-outline-secondary" disabled={pending}>
          {pending ? "Zapisywanie…" : "Zapisz rozstrzygnięcie"}
        </button>
      </div>
    </form>
  );
}
