"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { readApiError } from "@/lib/apiError";

export function NewBodyForm() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await fetch("/api/bodies", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null }),
      });
      if (r.ok) {
        toast.success("Organ został dodany.");
        setName(""); setDescription(""); router.refresh();
      } else {
        toast.error(await readApiError(r));
      }
    });
  }

  return (
    <form onSubmit={submit} className="card shadow-sm p-4 d-flex flex-wrap align-items-end gap-3">
      <div className="flex-grow-1" style={{ minWidth: 200 }}>
        <label className="form-label eyebrow">Nazwa organu / zespołu</label>
        <input className="form-control" required value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Rada Nadzorcza" />
      </div>
      <div className="flex-grow-1" style={{ minWidth: 200 }}>
        <label className="form-label eyebrow">Opis (opcjonalnie)</label>
        <input className="form-control" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Dodawanie…" : "Dodaj organ"}</button>
    </form>
  );
}
