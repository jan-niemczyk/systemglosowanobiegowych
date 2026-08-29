import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/labels";
import { CaseStatus } from "@prisma/client";
import Link from "next/link";
import { StatusPill } from "@/components/StatusPill";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [openCases, needsPublish, upcoming] = await Promise.all([
    prisma.case.findMany({ where: { status: CaseStatus.OPEN }, orderBy: { deadlineAt: "asc" }, take: 10 }),
    prisma.case.findMany({ where: { status: CaseStatus.CLOSED }, orderBy: { closedAt: "desc" }, take: 10 }),
    prisma.case.findMany({
      where: { status: CaseStatus.OPEN, deadlineAt: { not: null } },
      orderBy: { deadlineAt: "asc" },
      take: 5,
    }),
  ]);

  return (
    <div className="container py-4 py-md-5 d-flex flex-column gap-4" style={{ maxWidth: 1100 }}>
      <header>
        <div className="eyebrow mb-2">Pulpit operatora</div>
        <h1 className="h3 mb-0">Przegląd</h1>
      </header>

      <section className="card shadow-sm">
        <div className="card-header bg-white fw-medium small">Najbliższe terminy</div>
        <div className="card-body">
          {upcoming.length === 0 ? (
            <p className="small text-secondary-emphasis mb-0">Brak spraw z ustalonym terminem.</p>
          ) : (
            <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
              {upcoming.map((c) => (
                <li key={c.id} className="card card-soft p-3 d-flex flex-row align-items-center justify-content-between">
                  <Link href={`/cases/${c.id}`} className="small fw-medium text-decoration-none text-body">
                    {c.number ? `${c.number} - ` : ""}{c.title}
                  </Link>
                  <span className="text-secondary-emphasis" style={{ fontSize: 12 }}>{formatDateTime(c.deadlineAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="row g-4">
        <div className="col-12 col-sm-6">
          <CaseMiniList title={`Sprawy otwarte (${openCases.length})`} cases={openCases} empty="Brak otwartych spraw." />
        </div>
        <div className="col-12 col-sm-6">
          <CaseMiniList title={`Wymagają publikacji wyników (${needsPublish.length})`} cases={needsPublish} empty="Brak spraw oczekujących na publikację wyników." />
        </div>
      </div>
    </div>
  );
}

function CaseMiniList({ title, cases, empty }: { title: string; cases: { id: string; number: string | null; title: string; status: CaseStatus }[]; empty: string }) {
  return (
    <section className="card shadow-sm h-100">
      <div className="card-header bg-white fw-medium small">{title}</div>
      <div className="card-body">
        {cases.length === 0 ? (
          <p className="small text-secondary-emphasis mb-0">{empty}</p>
        ) : (
          <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
            {cases.map((c) => (
              <li key={c.id} className="card card-soft p-3 d-flex flex-row align-items-center justify-content-between gap-3">
                <Link href={`/cases/${c.id}`} className="small fw-medium text-truncate text-decoration-none text-body">
                  {c.number ? `${c.number} - ` : ""}{c.title}
                </Link>
                <StatusPill status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
