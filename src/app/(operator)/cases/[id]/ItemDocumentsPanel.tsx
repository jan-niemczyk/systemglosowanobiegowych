"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CaseStatus, DocumentKind } from "@prisma/client";
import { DOCUMENT_KIND_LABEL } from "@/lib/labels";

type Doc = { id: string; kind: DocumentKind; fileName: string; sizeBytes: number; uploadedAt: string };

/** Dokumenty przypięte do konkretnej pozycji głosowania (nie do całej sprawy). */
export function ItemDocumentsPanel({
  caseId, itemId, caseStatus, documents,
}: { caseId: string; itemId: string; caseStatus: CaseStatus; documents: Doc[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const draftEditable = caseStatus === "DRAFT" || caseStatus === "OPEN";
  const resultEditable = caseStatus === "CLOSED" || caseStatus === "RESULTS_PUBLISHED";
  const [kind, setKind] = useState<DocumentKind>(draftEditable ? "DRAFT" : "RESULT");
  const [expanded, setExpanded] = useState(documents.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function upload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Wybierz plik."); return; }
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    startTransition(async () => {
      const r = await fetch(`/api/cases/${caseId}/items/${itemId}/documents`, { method: "POST", body: form });
      if (r.ok) { if (fileRef.current) fileRef.current.value = ""; router.refresh(); } else setError(await r.text());
    });
  }

  function remove(docId: string) {
    if (!confirm("Usunąć dokument?")) return;
    startTransition(async () => {
      await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      router.refresh();
    });
  }

  const canEditKind = (k: DocumentKind) => (k === "RESULT" ? resultEditable : draftEditable);
  const canUpload = draftEditable || resultEditable;

  if (!expanded) {
    return (
      <button type="button" className="btn btn-sm" onClick={() => setExpanded(true)}>
        Dokumenty pozycji ({documents.length})
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="eyebrow">Dokumenty pozycji</div>
      {documents.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>Brak dokumentów.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left" style={{ color: "var(--color-ink-3)" }}>
              <th className="pb-1 font-normal">Plik</th>
              <th className="pb-1 font-normal">Rodzaj</th>
              <th className="pb-1 font-normal">Rozmiar</th>
              <th className="pb-1 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} className="border-t" style={{ borderColor: "var(--color-rule-soft)" }}>
                <td className="py-1"><a href={`/api/documents/${d.id}`} className="underline">{d.fileName}</a></td>
                <td className="py-1">{DOCUMENT_KIND_LABEL[d.kind]}</td>
                <td className="py-1 num text-xs">{Math.round(d.sizeBytes / 1024)} KB</td>
                <td className="py-1 text-right">
                  {canEditKind(d.kind) && (
                    <button className="btn btn-sm btn-danger" disabled={pending} onClick={() => remove(d.id)}>Usuń</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canUpload && (
        <form onSubmit={upload} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Rodzaj</label>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
              {draftEditable && <option value="DRAFT">{DOCUMENT_KIND_LABEL.DRAFT}</option>}
              {draftEditable && <option value="ATTACHMENT">{DOCUMENT_KIND_LABEL.ATTACHMENT}</option>}
              {resultEditable && <option value="RESULT">{DOCUMENT_KIND_LABEL.RESULT}</option>}
            </select>
          </div>
          <div>
            <label className="label">Plik</label>
            <input ref={fileRef} type="file" className="input" />
          </div>
          <button type="submit" className="btn btn-sm" disabled={pending}>{pending ? "Wgrywanie…" : "Dodaj dokument"}</button>
          {error && <div className="text-sm w-full" style={{ color: "var(--color-no)" }}>{error}</div>}
        </form>
      )}
    </div>
  );
}
