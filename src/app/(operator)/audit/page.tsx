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
    <div className="px-6 py-8 max-w-[1100px] mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="eyebrow mb-2">Rozliczalność</div>
          <h1 style={{ fontSize: 28 }}>Rejestr czynności</h1>
        </div>
        <a className="btn btn-sm" href="/api/audit/csv">Eksport CSV</a>
      </header>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left" style={{ color: "var(--color-ink-3)" }}>
            <th className="pb-2 font-normal">Data</th>
            <th className="pb-2 font-normal">Zdarzenie</th>
            <th className="pb-2 font-normal">Sprawa</th>
            <th className="pb-2 font-normal">Użytkownik</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-t" style={{ borderColor: "var(--color-rule-soft)" }}>
              <td className="py-1 num text-xs">{formatDateTime(l.createdAt)}</td>
              <td className="py-1">{l.description}</td>
              <td className="py-1">{l.case ? (l.case.number ? `${l.case.number} — ` : "") + l.case.title : "—"}</td>
              <td className="py-1">{l.user ? `${l.user.firstName} ${l.user.lastName}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
