import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { case: true, user: true },
  });

  return (
    <div className="container py-4 py-md-5 d-flex flex-column gap-4" style={{ maxWidth: 1100 }}>
      <header className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <div className="eyebrow mb-2">Rozliczalność</div>
          <h1 className="h3 mb-0">Rejestr czynności</h1>
        </div>
        <a className="btn btn-sm btn-outline-secondary" href="/api/audit/csv">Eksport CSV</a>
      </header>

      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr className="text-secondary-emphasis small">
                <th className="fw-normal ps-3">Data</th>
                <th className="fw-normal">Zdarzenie</th>
                <th className="fw-normal">Sprawa</th>
                <th className="fw-normal pe-3">Użytkownik</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="num ps-3" style={{ fontSize: 12 }}>{formatDateTime(l.createdAt)}</td>
                  <td>{l.description}</td>
                  <td>{l.case ? (l.case.number ? `${l.case.number} - ` : "") + l.case.title : "-"}</td>
                  <td className="pe-3">{l.user ? `${l.user.firstName} ${l.user.lastName}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
