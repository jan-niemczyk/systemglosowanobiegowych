import { prisma } from "@/lib/db";
import Link from "next/link";
import { NewBodyForm } from "./NewBodyForm";

export const dynamic = "force-dynamic";

export default async function BodiesPage() {
  const bodies = await prisma.body.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true, cases: true } } },
  });

  return (
    <div className="container py-4 py-md-5 d-flex flex-column gap-4" style={{ maxWidth: 800 }}>
      <header>
        <div className="eyebrow mb-2">Rejestr organów</div>
        <h1 className="h3 mb-0">Organy i zespoły</h1>
      </header>

      <div className="card shadow-sm">
        {bodies.length === 0 ? (
          <div className="card-body">
            <p className="small text-secondary-emphasis mb-0">Brak zdefiniowanych organów.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr className="text-secondary-emphasis small">
                  <th className="fw-normal ps-3">Nazwa</th>
                  <th className="fw-normal">Skład</th>
                  <th className="fw-normal pe-3">Sprawy</th>
                </tr>
              </thead>
              <tbody>
                {bodies.map((b) => (
                  <tr key={b.id}>
                    <td className="ps-3">
                      <Link href={`/bodies/${b.id}`} className="fw-medium text-decoration-none text-body">{b.name}</Link>
                    </td>
                    <td className="num">{b._count.members}</td>
                    <td className="num pe-3">{b._count.cases}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewBodyForm />
    </div>
  );
}
