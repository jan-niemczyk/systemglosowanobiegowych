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
    <div className="container py-4 py-md-5 d-flex flex-column gap-4" style={{ maxWidth: 800 }}>
      <header>
        <div className="eyebrow mb-2">Moje sprawy</div>
        <h1 className="h3 mb-0">Sprawy obiegowe</h1>
      </header>

      <section>
        <h2 className="small fw-medium mb-3">Do głosowania ({open.length})</h2>
        {open.length === 0 ? (
          <p className="small text-secondary-emphasis mb-0">Brak spraw oczekujących na Twój głos.</p>
        ) : (
          <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
            {open.map((p) => <CaseRow key={p.id} c={p.case} />)}
          </ul>
        )}
      </section>

      <section>
        <h2 className="small fw-medium mb-3">Pozostałe ({other.length})</h2>
        <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
          {other.map((p) => <CaseRow key={p.id} c={p.case} />)}
        </ul>
      </section>
    </div>
  );
}

function CaseRow({ c }: { c: { id: string; number: string | null; title: string; status: "DRAFT" | "OPEN" | "CLOSED" | "RESULTS_PUBLISHED" | "CANCELLED"; deadlineAt: Date | null } }) {
  return (
    <li className="card card-soft p-3 d-flex flex-row align-items-center justify-content-between gap-3">
      <Link href={`/my-cases/${c.id}`} className="min-w-0 text-decoration-none text-body">
        <div className="fw-medium text-truncate">{c.number ? `${c.number} - ` : ""}{c.title}</div>
        {c.deadlineAt && <div className="text-secondary-emphasis mt-1" style={{ fontSize: 12 }}>Termin: {formatDateTime(c.deadlineAt)}</div>}
      </Link>
      <StatusPill status={c.status} />
    </li>
  );
}
