import { DOCUMENT_KIND_LABEL } from "@/lib/labels";
import type { DocumentKind } from "@prisma/client";

type Doc = { id: string; kind: DocumentKind; fileName: string };

/** Lista dokumentów pozycji głosowania (widok uczestnika - tylko do odczytu). */
export function ItemDocuments({ documents }: { documents: Doc[] }) {
  if (documents.length === 0) return null;
  return (
    <ul className="text-sm space-y-1 mt-2">
      {documents.map((d) => (
        <li key={d.id}>
          <a className="underline" href={`/api/documents/${d.id}`}>{d.fileName}</a>
          <span className="ml-2 text-xs" style={{ color: "var(--color-ink-3)" }}>({DOCUMENT_KIND_LABEL[d.kind]})</span>
        </li>
      ))}
    </ul>
  );
}
