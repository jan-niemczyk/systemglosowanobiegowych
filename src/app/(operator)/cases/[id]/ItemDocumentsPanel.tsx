"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DocumentKind } from "@prisma/client";
import { DOCUMENT_KIND_LABEL } from "@/lib/labels";

type Doc = { id: string; kind: DocumentKind; fileName: string; sizeBytes: number; uploadedAt: string };

/** Dokumenty przypięte do konkretnej pozycji głosowania (nie do całej sprawy). Swobodna wymiana w każdym czasie. */
export function ItemDocumentsPanel({
  caseId, itemId, documents,
}: { caseId: string; itemId: string; documents: Doc[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocumentKind>("DRAFT");
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

  if (!expanded) {
    return (
      <button type="button" className="btn btn-sm btn-outline-secondary rounded-pill align-self-start" onClick={() => setExpanded(true)}>
        Dokumenty pozycji ({documents.length})
      </button>
    );
  }

  return (
    <div className="card card-soft p-3 d-flex flex-column gap-3">
      <div className="eyebrow">Dokumenty pozycji</div>
      {documents.length === 0 ? (
        <p className="small text-secondary-emphasis mb-0">Brak dokumentów.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr className="text-secondary-emphasis">
                <th className="fw-normal">Plik</th>
                <th className="fw-normal">Rodzaj</th>
                <th className="fw-normal">Rozmiar</th>
                <th className="fw-normal"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td><a href={`/api/documents/${d.id}`} className="link-primary">{d.fileName}</a></td>
                  <td>{DOCUMENT_KIND_LABEL[d.kind]}</td>
                  <td className="num" style={{ fontSize: 12 }}>{Math.round(d.sizeBytes / 1024)} KB</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-danger" disabled={pending} onClick={() => remove(d.id)}>Usuń</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={upload} className="d-flex flex-wrap align-items-end gap-3">
        <div>
          <label className="form-label eyebrow">Rodzaj</label>
          <select className="form-select" value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
            <option value="DRAFT">{DOCUMENT_KIND_LABEL.DRAFT}</option>
            <option value="ATTACHMENT">{DOCUMENT_KIND_LABEL.ATTACHMENT}</option>
            <option value="RESULT">{DOCUMENT_KIND_LABEL.RESULT}</option>
          </select>
        </div>
        <div>
          <label className="form-label eyebrow">Plik</label>
          <input ref={fileRef} type="file" className="form-control" />
        </div>
        <button type="submit" className="btn btn-sm btn-outline-secondary rounded-pill" disabled={pending}>{pending ? "Wgrywanie…" : "Dodaj dokument"}</button>
        {error && <div className="alert alert-danger py-2 mb-0 w-100">{error}</div>}
      </form>
    </div>
  );
}
