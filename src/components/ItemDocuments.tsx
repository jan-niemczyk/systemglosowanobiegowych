import { DOCUMENT_KIND_LABEL } from "@/lib/labels";
import { IconDocument } from "@/components/ui/Icon";
import type { DocumentKind } from "@prisma/client";

type Doc = { id: string; kind: DocumentKind; fileName: string };

/** Lista dokumentów pozycji głosowania (widok uczestnika - tylko do odczytu). */
export function ItemDocuments({ documents }: { documents: Doc[] }) {
  if (documents.length === 0) return null;
  return (
    <div className="card card-soft mt-2 p-3 d-flex flex-column gap-2">
      <div className="eyebrow mb-1">Załączone dokumenty</div>
      <div className="list-group list-group-flush">
        {documents.map((d) => (
          <a
            key={d.id}
            href={`/api/documents/${d.id}`}
            className="list-group-item list-group-item-action d-flex align-items-center gap-2 px-2"
          >
            <IconDocument size={18} className="text-secondary-emphasis" />
            <span className="flex-grow-1 text-truncate small">{d.fileName}</span>
            <span className="badge text-bg-light border small text-nowrap">{DOCUMENT_KIND_LABEL[d.kind]}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
