import { DOCUMENT_KIND_LABEL } from "@/lib/labels";
import type { DocumentKind } from "@prisma/client";

type Doc = { id: string; kind: DocumentKind; fileName: string };

/** Lista dokumentów pozycji głosowania (widok uczestnika - tylko do odczytu). */
export function ItemDocuments({ documents }: { documents: Doc[] }) {
  if (documents.length === 0) return null;
  return (
    <ul className="list-unstyled small mt-2 mb-0">
      {documents.map((d) => (
        <li key={d.id} className="mb-1">
          <a className="link-primary" href={`/api/documents/${d.id}`}>{d.fileName}</a>
          <span className="ms-2 text-secondary-emphasis" style={{ fontSize: 12 }}>({DOCUMENT_KIND_LABEL[d.kind]})</span>
        </li>
      ))}
    </ul>
  );
}
