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
    <div className="px-6 py-8 max-w-[1100px] mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="eyebrow mb-2">Sprawy obiegowe</div>
          <h1 style={{ fontSize: 28 }}>Sprawy</h1>
        </div>
        <Link href="/cases/new" className="btn btn-primary">Nowa sprawa</Link>
      </header>

      <nav className="flex gap-1 text-sm border-b" style={{ borderColor: "var(--color-rule-soft)" }}>
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.value ? `/cases?status=${t.value}` : "/cases"}
            className="px-3 py-2"
            style={{
              textDecoration: "none",
              borderBottom: (status ?? undefined) === t.value ? "2px solid var(--color-ink)" : "2px solid transparent",
              color: (status ?? undefined) === t.value ? "var(--color-ink)" : "var(--color-ink-3)",
            }}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {cases.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>Brak spraw w tym widoku.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left" style={{ color: "var(--color-ink-3)" }}>
              <th className="pb-2 font-normal">Sprawa</th>
              <th className="pb-2 font-normal">Organ</th>
              <th className="pb-2 font-normal">Status</th>
              <th className="pb-2 font-normal">Pozycje</th>
              <th className="pb-2 font-normal">Skład</th>
              <th className="pb-2 font-normal">Termin</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-t" style={{ borderColor: "var(--color-rule-soft)" }}>
                <td className="py-2">
                  <Link href={`/cases/${c.id}`} style={{ textDecoration: "none", color: "inherit" }} className="font-medium">
                    {c.number ? `${c.number} — ` : ""}{c.title}
                  </Link>
                </td>
                <td className="py-2">{c.body?.name ?? "—"}</td>
                <td className="py-2"><StatusPill status={c.status} /></td>
                <td className="py-2 num">{c._count.items}</td>
                <td className="py-2 num">{c._count.participants}</td>
                <td className="py-2 num text-xs">{formatDateTime(c.deadlineAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
