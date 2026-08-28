"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DocumentKind, MajorityBase, MajorityKind, VoteType, VoteVisibility } from "@prisma/client";
import { VOTE_TYPE_LABEL, VOTE_VISIBILITY_LABEL } from "@/lib/labels";
import { KIND_LABELS, BASE_LABELS } from "@/lib/majority";
import { ItemDocumentsPanel } from "./ItemDocumentsPanel";

type Option = { id?: string; label: string; description?: string | null };
type ItemDoc = { id: string; kind: DocumentKind; fileName: string; sizeBytes: number; uploadedAt: string };
type Item = {
  id: string; order: number; title: string; description: string | null;
  type: VoteType; visibility: VoteVisibility; majorityKind: MajorityKind; majorityBase: MajorityBase;
  minSelections: number | null; maxSelections: number | null;
  options: Option[];
  documents: ItemDoc[];
};

export function ItemsEditor({ caseId, items }: { caseId: string; items: Item[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove(itemId: string) {
    if (!confirm("Usunąć pozycję głosowania?")) return;
    startTransition(async () => {
      await fetch(`/api/cases/${caseId}/items/${itemId}`, { method: "DELETE" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && !adding && (
        <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>Brak pozycji głosowania.</p>
      )}
      {items.map((item) => (
        editingId === item.id ? (
          <ItemForm key={item.id} caseId={caseId} item={item} onDone={() => { setEditingId(null); router.refresh(); }} onCancel={() => setEditingId(null)} />
        ) : (
          <div key={item.id} className="card-soft p-3 flex items-start justify-between gap-3">
            <div>
              <div className="font-medium text-sm">{item.order}. {item.title}</div>
              <div className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>
                {VOTE_TYPE_LABEL[item.type]} · {VOTE_VISIBILITY_LABEL[item.visibility]} · {KIND_LABELS[item.majorityKind]} · {BASE_LABELS[item.majorityBase]}
              </div>
              {item.options.length > 0 && (
                <div className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>
                  Opcje: {item.options.map((o) => o.label).join(", ")}
                </div>
              )}
              <div className="mt-2">
                <ItemDocumentsPanel caseId={caseId} itemId={item.id} caseStatus="DRAFT" documents={item.documents} />
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button className="btn btn-sm" disabled={pending} onClick={() => setEditingId(item.id)}>Edytuj</button>
              <button className="btn btn-sm btn-danger" disabled={pending} onClick={() => remove(item.id)}>Usuń</button>
            </div>
          </div>
        )
      ))}

      {adding ? (
        <ItemForm caseId={caseId} onDone={() => { setAdding(false); router.refresh(); }} onCancel={() => setAdding(false)} />
      ) : (
        <button className="btn btn-sm" onClick={() => setAdding(true)}>+ Dodaj pozycję głosowania</button>
      )}
    </div>
  );
}

function ItemForm({
  caseId, item, onDone, onCancel,
}: { caseId: string; item?: Item; onDone: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [type, setType] = useState<VoteType>(item?.type ?? "STANDARD");
  const [visibility, setVisibility] = useState<VoteVisibility>(item?.visibility ?? "OPEN");
  const [majorityKind, setMajorityKind] = useState<MajorityKind>(item?.majorityKind ?? "SIMPLE");
  const [majorityBase, setMajorityBase] = useState<MajorityBase>(item?.majorityBase ?? "OF_VOTERS");
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
      title, description: description || null, type, visibility, majorityKind, majorityBase,
      minSelections: minSelections ? Number(minSelections) : null,
      maxSelections: maxSelections ? Number(maxSelections) : null,
      options: needsOptions ? options : [],
    };

    startTransition(async () => {
      const url = item ? `/api/cases/${caseId}/items/${item.id}` : `/api/cases/${caseId}/items`;
      const r = await fetch(url, { method: item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) onDone(); else setError(await r.text());
    });
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <div>
        <label className="label">Tytuł pozycji</label>
        <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label">Opis</label>
        <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Typ głosowania</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as VoteType)}>
            {Object.entries(VOTE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Jawność</label>
          <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value as VoteVisibility)}>
            {Object.entries(VOTE_VISIBILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Reguła większości</label>
          <select className="input" value={majorityKind} onChange={(e) => setMajorityKind(e.target.value as MajorityKind)}>
            {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Mianownik</label>
          <select className="input" value={majorityBase} onChange={(e) => setMajorityBase(e.target.value as MajorityBase)} disabled={majorityKind === "SIMPLE"}>
            {Object.entries(BASE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      {type === "LIST" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Minimum zaznaczeń</label>
            <input type="number" min={0} className="input" value={minSelections} onChange={(e) => setMinSelections(e.target.value)} />
          </div>
          <div>
            <label className="label">Maksimum zaznaczeń</label>
            <input type="number" min={0} className="input" value={maxSelections} onChange={(e) => setMaxSelections(e.target.value)} />
          </div>
        </div>
      )}
      {needsOptions && (
        <div>
          <label className="label">{type === "LIST" ? "Kandydaci / opcje (jeden na linię)" : "Pozycje pakietu (jedna na linię)"}</label>
          <textarea className="input" rows={4} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
        </div>
      )}
      {error && <div className="text-sm" style={{ color: "var(--color-no)" }}>{error}</div>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz"}</button>
        <button type="button" className="btn btn-sm" onClick={onCancel} disabled={pending}>Anuluj</button>
      </div>
    </form>
  );
}
