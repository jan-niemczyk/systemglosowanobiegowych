import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/labels";
import { StatusPill } from "@/components/StatusPill";
import Link from "next/link";
import { CaseStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function CasesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const cases = await prisma.case.findMany({
    where: status ? { status: status as CaseStatus } : undefined,
    orderBy: { createdAt: "desc" },
    include: { body: true, _count: { select: { items: true, participants: true } } },
  });

  const tabs: { label: string; value?: string }[] = [
    { label: "Wszystkie" },
    { label: "Projekty", value: "DRAFT" },
    { label: "Otwarte", value: "OPEN" },
    { label: "Zamknięte", value: "CLOSED" },
    { label: "Wyniki opublikowane", value: "RESULTS_PUBLISHED" },
  ];

  return (
    <div className="container py-4 py-md-5 d-flex flex-column gap-4" style={{ maxWidth: 1100 }}>
      <header className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <div className="eyebrow mb-2">Sprawy obiegowe</div>
          <h1 className="h3 mb-0">Sprawy</h1>
        </div>
        <Link href="/cases/new" className="btn btn-primary">Nowa sprawa</Link>
      </header>

      <ul className="nav nav-pills gap-1 small">
        {tabs.map((t) => (
          <li key={t.label} className="nav-item">
            <Link
              href={t.value ? `/cases?status=${t.value}` : "/cases"}
              className={`nav-link ${(status ?? undefined) === t.value ? "active" : "text-body"}`}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="card shadow-sm">
        {cases.length === 0 ? (
          <div className="card-body">
            <p className="small text-secondary-emphasis mb-0">Brak spraw w tym widoku.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr className="text-secondary-emphasis small">
                  <th className="fw-normal ps-3">Sprawa</th>
                  <th className="fw-normal">Organ</th>
                  <th className="fw-normal">Status</th>
                  <th className="fw-normal">Pozycje</th>
                  <th className="fw-normal">Skład</th>
                  <th className="fw-normal pe-3">Termin</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td className="ps-3">
                      <Link href={`/cases/${c.id}`} className="text-decoration-none text-body fw-medium">
                        {c.number ? `${c.number} - ` : ""}{c.title}
                      </Link>
                    </td>
                    <td>{c.body?.name ?? "-"}</td>
                    <td><StatusPill status={c.status} /></td>
                    <td className="num">{c._count.items}</td>
                    <td className="num">{c._count.participants}</td>
                    <td className="num pe-3" style={{ fontSize: 12 }}>{formatDateTime(c.deadlineAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
