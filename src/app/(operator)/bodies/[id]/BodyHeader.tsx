"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { readApiError } from "@/lib/apiError";

export function BodyHeader({
  bodyId, name, description,
}: {
  bodyId: string;
  name: string;
  description: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const [descriptionValue, setDescriptionValue] = useState(description ?? "");
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await fetch(`/api/bodies/${bodyId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue, description: descriptionValue || null }),
      });
      if (r.ok) { toast.success("Dane organu zostały zapisane."); setEditing(false); router.refresh(); }
      else toast.error(await readApiError(r));
    });
  }

  function remove() {
    if (!confirm(`Usunąć organ „${name}”? Skład zostanie usunięty, a przypisane sprawy stracą powiązanie z organem. Tej operacji nie można cofnąć.`)) return;
    startTransition(async () => {
      const r = await fetch(`/api/bodies/${bodyId}`, { method: "DELETE" });
      if (r.ok) { toast.success("Organ został usunięty."); router.push("/bodies"); }
      else toast.error(await readApiError(r));
    });
  }

  if (editing) {
    return (
      <form onSubmit={save} className="card shadow-sm p-4 d-flex flex-column gap-3">
        <div>
          <label className="form-label eyebrow">Nazwa organu / zespołu</label>
          <input className="form-control" required value={nameValue} onChange={(e) => setNameValue(e.target.value)} />
        </div>
        <div>
          <label className="form-label eyebrow">Opis (opcjonalnie)</label>
          <input className="form-control" value={descriptionValue} onChange={(e) => setDescriptionValue(e.target.value)} />
        </div>
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz"}</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={pending} onClick={() => { setEditing(false); setNameValue(name); setDescriptionValue(description ?? ""); }}>Anuluj</button>
        </div>
      </form>
    );
  }

  return (
    <header className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
      <div>
        <div className="eyebrow mb-2">Organ</div>
        <h1 className="h3 mb-0">{name}</h1>
        {description && <p className="small mt-2 text-secondary-emphasis">{description}</p>}
      </div>
      <div className="d-flex gap-2">
        <button className="btn btn-sm btn-outline-secondary" disabled={pending} onClick={() => setEditing(true)}>Edytuj</button>
        <button className="btn btn-outline-danger btn-sm" disabled={pending} onClick={remove}>Usuń organ</button>
      </div>
    </header>
  );
}
