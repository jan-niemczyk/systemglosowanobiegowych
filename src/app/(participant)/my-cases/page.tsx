import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { StatusPill } from "@/components/StatusPill";
import { formatDateTime } from "@/lib/labels";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MyCasesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const participations = await prisma.caseParticipant.findMany({
    where: { userId: session.user.id, case: { status: { not: "DRAFT" } } },
    include: { case: true },
    orderBy: { case: { createdAt: "desc" } },
  });

  const open = participations.filter((p) => p.case.status === "OPEN");
  const other = participations.filter((p) => p.case.status !== "OPEN");

  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto space-y-8">
      <header>
        <div className="eyebrow mb-2">Moje sprawy</div>
        <h1 style={{ fontSize: 28 }}>Sprawy obiegowe</h1>
      </header>

      <section>
        <h2 className="text-sm font-medium mb-3">Do głosowania ({open.length})</h2>
        {open.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>Brak spraw oczekujących na Twój głos.</p>
        ) : (
          <ul className="space-y-2">
            {open.map((p) => <CaseRow key={p.id} c={p.case} />)}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium mb-3">Pozostałe ({other.length})</h2>
        <ul className="space-y-2">
          {other.map((p) => <CaseRow key={p.id} c={p.case} />)}
        </ul>
      </section>
    </div>
  );
}

function CaseRow({ c }: { c: { id: string; number: string | null; title: string; status: "DRAFT" | "OPEN" | "CLOSED" | "RESULTS_PUBLISHED" | "CANCELLED"; deadlineAt: Date | null } }) {
  return (
    <li className="card p-4 flex items-center justify-between gap-3">
      <Link href={`/my-cases/${c.id}`} className="min-w-0" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="font-medium truncate">{c.number ? `${c.number} - ` : ""}{c.title}</div>
        {c.deadlineAt && <div className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>Termin: {formatDateTime(c.deadlineAt)}</div>}
      </Link>
      <StatusPill status={c.status} />
    </li>
  );
}
