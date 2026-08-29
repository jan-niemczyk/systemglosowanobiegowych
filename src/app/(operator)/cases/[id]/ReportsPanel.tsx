export function ReportsPanel({ caseId, items }: { caseId: string; items: { id: string; title: string }[] }) {
  return (
    <div className="d-flex flex-column gap-4 small">
      <div className="d-flex flex-wrap gap-2">
        <a className="btn btn-sm btn-outline-secondary" href={`/api/cases/${caseId}/reports/case-card`}>Protokół (PDF)</a>
        <a className="btn btn-sm btn-outline-secondary" href={`/api/cases/${caseId}/reports/protocol`}>Protokół (Word)</a>
      </div>
      <div>
        <div className="eyebrow mb-2">Raporty pozycji głosowania</div>
        <ul className="list-unstyled d-flex flex-column gap-1 mb-0">
          {items.map((item) => (
            <li key={item.id} className="d-flex align-items-center gap-2">
              <span className="text-truncate">{item.title}</span>
              <a className="btn btn-sm btn-outline-secondary" href={`/api/cases/${caseId}/items/${item.id}/reports/vote-report`}>Raport głosowania</a>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-secondary-emphasis mb-0">
        Potwierdzenie oddania głosu każdy uczestnik pobiera samodzielnie ze szczegółów swojej sprawy.
      </p>
    </div>
  );
}
