import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/labels";
import { CaseStatus } from "@prisma/client";
import Link from "next/link";
import { StatusPill } from "@/components/StatusPill";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [openCases, needsPublish, upcoming, recentAudit] = await Promise.all([
    prisma.case.findMany({ where: { status: CaseStatus.OPEN }, orderBy: { deadlineAt: "asc" }, take: 10 }),
    prisma.case.findMany({ where: { status: CaseStatus.CLOSED }, orderBy: { closedAt: "desc" }, take: 10 }),
    prisma.case.findMany({
      where: { status: CaseStatus.OPEN, deadlineAt: { not: null } },
      orderBy: { deadlineAt: "asc" },
      take: 5,
    }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { case: true, user: true } }),
  ]);

  return (
    <div className="px-6 py-8 max-w-[1100px] mx-auto space-y-8">
      <header>
        <div className="eyebrow mb-2">Pulpit operatora</div>
        <h1 style={{ fontSize: 28 }}>Przegląd</h1>
      </header>

      <section>
        <h2 className="text-sm font-medium mb-3">Najbliższe terminy</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>Brak spraw z ustalonym terminem.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((c) => (
              <li key={c.id} className="card-soft p-3 flex items-center justify-between">
                <Link href={`/cases/${c.id}`} className="text-sm font-medium" style={{ textDecoration: "none", color: "inherit" }}>
                  {c.number ? `${c.number} - ` : ""}{c.title}
                </Link>
                <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>{formatDateTime(c.deadlineAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="text-sm font-medium mb-3">Sprawy otwarte ({openCases.length})</h2>
          <CaseMiniList cases={openCases} empty="Brak otwartych spraw." />
        </section>
        <section>
          <h2 className="text-sm font-medium mb-3">Wymagają publikacji wyników ({needsPublish.length})</h2>
          <CaseMiniList cases={needsPublish} empty="Brak spraw oczekujących na publikację wyników." />
        </section>
      </div>

      <section>
        <h2 className="text-sm font-medium mb-3">Ostatnie czynności</h2>
        <ul className="space-y-1">
          {recentAudit.map((l) => (
            <li key={l.id} className="text-sm flex items-center gap-3">
              <span className="text-xs num shrink-0" style={{ color: "var(--color-ink-3)" }}>{formatDateTime(l.createdAt)}</span>
              <span>{l.description}</span>
              {l.case && (
                <Link href={`/cases/${l.case.id}`} className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                  ({l.case.title})
                </Link>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <Link href="/audit" className="btn btn-sm">Pełny rejestr czynności</Link>
        </div>
      </section>
    </div>
  );
}

function CaseMiniList({ cases, empty }: { cases: { id: string; number: string | null; title: string; status: CaseStatus }[]; empty: string }) {
  if (cases.length === 0) return <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>{empty}</p>;
  return (
    <ul className="space-y-2">
      {cases.map((c) => (
        <li key={c.id} className="card-soft p-3 flex items-center justify-between gap-3">
          <Link href={`/cases/${c.id}`} className="text-sm font-medium truncate" style={{ textDecoration: "none", color: "inherit" }}>
            {c.number ? `${c.number} - ` : ""}{c.title}
          </Link>
          <StatusPill status={c.status} />
        </li>
      ))}
    </ul>
  );
}
