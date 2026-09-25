"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { readApiError } from "@/lib/apiError";

/** Zmiana tematu (tytułu) pozycji głosowania - dostępna w każdym statusie sprawy. */
export function ItemTitleEditor({
  caseId, itemId, title,
}: { caseId: string; itemId: string; title: string }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [pending, startTransition] = useTransition();

  function start() {
    setValue(title);
    setEditing(true);
  }

  function save() {
    const trimmed = value.trim();
    if (!trimmed) { toast.error("Temat nie może być pusty."); return; }
    startTransition(async () => {
      const r = await fetch(`/api/cases/${caseId}/items/${itemId}/title`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (r.ok) { toast.success("Temat pozycji został zmieniony."); setEditing(false); router.refresh(); }
      else toast.error(await readApiError(r));
    });
  }

  if (!editing) {
    return (
      <button type="button" className="btn btn-sm btn-outline-secondary align-self-start" onClick={start}>
        Zmień temat
      </button>
    );
  }

  return (
    <div className="d-flex flex-column gap-2">
      <input
        className="form-control form-control-sm" autoFocus
        value={value} onChange={(e) => setValue(e.target.value)}
      />
      <div className="d-flex gap-2">
        <button type="button" className="btn btn-sm btn-outline-secondary" disabled={pending} onClick={save}>
          {pending ? "Zapisywanie…" : "Zapisz"}
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary" disabled={pending} onClick={() => setEditing(false)}>
          Anuluj
        </button>
      </div>
    </div>
  );
}
