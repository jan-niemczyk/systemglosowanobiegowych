export function ReportsPanel({ caseId, items }: { caseId: string; items: { id: string; title: string }[] }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-2">
        <a className="btn btn-sm" href={`/api/cases/${caseId}/reports/case-card`}>Protokół (PDF)</a>
        <a className="btn btn-sm" href={`/api/cases/${caseId}/reports/protocol`}>Protokół (Word)</a>
      </div>
      <div>
        <div className="eyebrow mb-2">Raporty pozycji głosowania</div>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <span className="min-w-0 truncate">{item.title}</span>
              <a className="btn btn-sm" href={`/api/cases/${caseId}/items/${item.id}/reports/vote-report`}>Raport głosowania</a>
              <a className="btn btn-sm" href={`/api/cases/${caseId}/items/${item.id}/reports/vote-report?format=csv`}>CSV</a>
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
