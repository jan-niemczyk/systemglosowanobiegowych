import type { VoteVisibility } from "@prisma/client";

export function ReportsPanel({ caseId, items }: { caseId: string; items: { id: string; title: string; visibility: VoteVisibility }[] }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-2">
        <a className="btn btn-sm" href={`/api/cases/${caseId}/reports/case-card`}>Zbiorcza karta sprawy (PDF)</a>
        <a className="btn btn-sm" href={`/api/cases/${caseId}/reports/protocol`}>Protokół (DOCX)</a>
      </div>
      <div>
        <div className="eyebrow mb-2">Raporty pozycji głosowania</div>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <span className="min-w-0 truncate">{item.title}</span>
              <a className="btn btn-sm" href={`/api/cases/${caseId}/items/${item.id}/reports/vote-report`}>Raport głosowania</a>
              <a className="btn btn-sm" href={`/api/cases/${caseId}/items/${item.id}/reports/vote-report?format=csv`}>CSV</a>
              {item.visibility === "OPEN" && (
                <a className="btn btn-sm" href={`/api/cases/${caseId}/items/${item.id}/reports/roll-call`}>Imienny wykaz</a>
              )}
            </li>
          ))}
        </ul>
      </div>
      <p style={{ color: "var(--color-ink-3)" }}>
        Potwierdzenie oddania głosu każdy uczestnik pobiera samodzielnie ze szczegółów swojej sprawy.
      </p>
    </div>
  );
}
