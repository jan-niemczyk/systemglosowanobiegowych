"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DocumentKind, VoteType, VoteVisibility } from "@prisma/client";
import { VOTE_TYPE_LABEL, VOTE_VISIBILITY_LABEL } from "@/lib/labels";
import { useToast } from "@/components/Toast";
import { readApiError } from "@/lib/apiError";
import { ItemDocumentsPanel } from "./ItemDocumentsPanel";

type Option = { id?: string; label: string; description?: string | null };
type ItemDoc = { id: string; kind: DocumentKind; fileName: string; sizeBytes: number; uploadedAt: string };
type Item = {
  id: string; order: number; title: string; description: string | null;
  type: VoteType; visibility: VoteVisibility;
  minSelections: number | null; maxSelections: number | null;
  options: Option[];
  documents: ItemDoc[];
};

export function ItemsEditor({ caseId, items }: { caseId: string; items: Item[] }) {
  const router = useRouter();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove(itemId: string) {
    if (!confirm("Usunąć pozycję głosowania?")) return;
    startTransition(async () => {
      const r = await fetch(`/api/cases/${caseId}/items/${itemId}`, { method: "DELETE" });
      if (r.ok) { toast.success("Pozycja głosowania została usunięta."); router.refresh(); }
      else toast.error(await readApiError(r));
    });
  }

  return (
    <div className="d-flex flex-column gap-3">
      {items.length === 0 && !adding && (
        <p className="small text-secondary-emphasis mb-0">Brak pozycji głosowania.</p>
      )}
      {items.map((item) => (
        editingId === item.id ? (
          <ItemForm key={item.id} caseId={caseId} item={item} onDone={() => { setEditingId(null); router.refresh(); }} onCancel={() => setEditingId(null)} />
        ) : (
          <div key={item.id} className="card card-soft p-3 d-flex flex-row align-items-start justify-content-between gap-3">
            <div>
              <div className="fw-medium small">{item.order}. {item.title}</div>
              <div className="text-secondary-emphasis mt-1" style={{ fontSize: 12 }}>
                {VOTE_TYPE_LABEL[item.type]} {VOTE_VISIBILITY_LABEL[item.visibility]}
              </div>
              {item.options.length > 0 && (
                <div className="text-secondary-emphasis mt-1" style={{ fontSize: 12 }}>
                  Opcje: {item.options.map((o) => o.label).join(", ")}
                </div>
              )}
              <div className="mt-2">
                <ItemDocumentsPanel caseId={caseId} itemId={item.id} documents={item.documents} />
              </div>
            </div>
            <div className="d-flex gap-2 flex-shrink-0">
              <button className="btn btn-sm btn-outline-secondary" disabled={pending} onClick={() => setEditingId(item.id)}>Edytuj</button>
              <button className="btn btn-sm btn-outline-danger" disabled={pending} onClick={() => remove(item.id)}>Usuń</button>
            </div>
          </div>
        )
      ))}

      {adding ? (
        <ItemForm caseId={caseId} onDone={() => { setAdding(false); router.refresh(); }} onCancel={() => setAdding(false)} />
      ) : (
        <button className="btn btn-sm btn-outline-secondary align-self-start" onClick={() => setAdding(true)}>+ Dodaj pozycję głosowania</button>
      )}
    </div>
  );
}

function ItemForm({
  caseId, item, onDone, onCancel,
}: { caseId: string; item?: Item; onDone: () => void; onCancel: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [type, setType] = useState<VoteType>(item?.type ?? "STANDARD");
  const [visibility, setVisibility] = useState<VoteVisibility>(item?.visibility ?? "OPEN");
  const [minSelections, setMinSelections] = useState(item?.minSelections?.toString() ?? "");
  const [maxSelections, setMaxSelections] = useState(item?.maxSelections?.toString() ?? "");
  const [optionsText, setOptionsText] = useState((item?.options ?? []).map((o) => o.label).join("\n"));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const needsOptions = type !== "STANDARD";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const options = optionsText.split("\n").map((l) => l.trim()).filter(Boolean).map((label) => ({ label }));
    if (needsOptions && options.length === 0) { setError("Podaj co najmniej jedną pozycję/kandydata (jeden na linię)."); return; }

    const payload = {
      title, description: description || null, type, visibility,
      minSelections: minSelections ? Number(minSelections) : null,
      maxSelections: maxSelections ? Number(maxSelections) : null,
      options: needsOptions ? options : [],
    };

    startTransition(async () => {
      const url = item ? `/api/cases/${caseId}/items/${item.id}` : `/api/cases/${caseId}/items`;
      const r = await fetch(url, { method: item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        toast.success(item ? "Zmiany w pozycji głosowania zostały zapisane." : "Pozycja głosowania została dodana.");
        onDone();
      } else {
        toast.error(await readApiError(r));
      }
    });
  }

  return (
    <form onSubmit={submit} className="card shadow-sm p-4 d-flex flex-column gap-3">
      <div>
        <label className="form-label eyebrow">Tytuł pozycji</label>
        <input className="form-control" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="form-label eyebrow">Opis</label>
        <textarea className="form-control" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="row g-3">
        <div className="col-12 col-sm-6">
          <label className="form-label eyebrow">Typ głosowania</label>
          <select className="form-select" value={type} onChange={(e) => setType(e.target.value as VoteType)}>
            {Object.entries(VOTE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="col-12 col-sm-6">
          <label className="form-label eyebrow">Jawność</label>
          <select className="form-select" value={visibility} onChange={(e) => setVisibility(e.target.value as VoteVisibility)}>
            {Object.entries(VOTE_VISIBILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      {type === "LIST" && (
        <div className="row g-3">
          <div className="col-12 col-sm-6">
            <label className="form-label eyebrow">Minimum zaznaczeń</label>
            <input type="number" min={0} className="form-control" value={minSelections} onChange={(e) => setMinSelections(e.target.value)} />
          </div>
          <div className="col-12 col-sm-6">
            <label className="form-label eyebrow">Maksimum zaznaczeń</label>
            <input type="number" min={0} className="form-control" value={maxSelections} onChange={(e) => setMaxSelections(e.target.value)} />
          </div>
        </div>
      )}
      {needsOptions && (
        <div>
          <label className="form-label eyebrow">{type === "LIST" ? "Kandydaci / opcje (jeden na linię)" : "Pozycje pakietu (jedna na linię)"}</label>
          <textarea className="form-control" rows={4} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
        </div>
      )}
      {error && <div className="alert alert-danger py-2 mb-0">{error}</div>}
      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz"}</button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onCancel} disabled={pending}>Anuluj</button>
      </div>
    </form>
  );
}
