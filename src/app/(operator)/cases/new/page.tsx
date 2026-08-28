import { prisma } from "@/lib/db";
import { NewCaseForm } from "./NewCaseForm";

export const dynamic = "force-dynamic";

export default async function NewCasePage() {
  const [bodies, settings] = await Promise.all([
    prisma.body.findMany({ orderBy: { name: "asc" } }),
    prisma.settings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }),
  ]);

  return (
    <div className="px-6 py-8 max-w-[640px] mx-auto">
      <header className="mb-6">
        <div className="eyebrow mb-2">Sprawy obiegowe</div>
        <h1 style={{ fontSize: 28 }}>Nowa sprawa</h1>
      </header>
      <NewCaseForm bodies={bodies.map((b) => ({ id: b.id, name: b.name }))} settings={settings} />
    </div>
  );
}
