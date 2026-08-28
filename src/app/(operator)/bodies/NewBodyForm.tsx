"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function NewBodyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await fetch("/api/bodies", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null }),
      });
      if (r.ok) { setName(""); setDescription(""); router.refresh(); } else setError(await r.text());
    });
  }

  return (
    <form onSubmit={submit} className="card p-4 flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[200px]">
        <label className="label">Nazwa organu / zespołu</label>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Rada Nadzorcza" />
      </div>
      <div className="flex-1 min-w-[200px]">
        <label className="label">Opis (opcjonalnie)</label>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Dodawanie…" : "Dodaj organ"}</button>
      {error && <div className="text-sm w-full" style={{ color: "var(--color-no)" }}>{error}</div>}
    </form>
  );
}
