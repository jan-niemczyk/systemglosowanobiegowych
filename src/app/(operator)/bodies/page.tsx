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
    <div className="px-6 py-8 max-w-[800px] mx-auto space-y-6">
      <header>
        <div className="eyebrow mb-2">Rejestr organów</div>
        <h1 style={{ fontSize: 28 }}>Organy i zespoły</h1>
      </header>

      {bodies.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>Brak zdefiniowanych organów.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left" style={{ color: "var(--color-ink-3)" }}>
              <th className="pb-2 font-normal">Nazwa</th>
              <th className="pb-2 font-normal">Skład</th>
              <th className="pb-2 font-normal">Sprawy</th>
            </tr>
          </thead>
          <tbody>
            {bodies.map((b) => (
              <tr key={b.id} className="border-t" style={{ borderColor: "var(--color-rule-soft)" }}>
                <td className="py-2">
                  <Link href={`/bodies/${b.id}`} className="font-medium" style={{ textDecoration: "none", color: "inherit" }}>{b.name}</Link>
                </td>
                <td className="py-2 num">{b._count.members}</td>
                <td className="py-2 num">{b._count.cases}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <NewBodyForm />
    </div>
  );
}
