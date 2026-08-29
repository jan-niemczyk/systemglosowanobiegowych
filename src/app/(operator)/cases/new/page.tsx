import { prisma } from "@/lib/db";
import { NewCaseForm } from "./NewCaseForm";

export const dynamic = "force-dynamic";

export default async function NewCasePage() {
  const [bodies, settings] = await Promise.all([
    prisma.body.findMany({ orderBy: { name: "asc" } }),
    prisma.settings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }),
  ]);

  return (
    <div className="container py-4 py-md-5" style={{ maxWidth: 640 }}>
      <header className="mb-4">
        <div className="eyebrow mb-2">Sprawy obiegowe</div>
        <h1 className="h3 mb-0">Nowa sprawa</h1>
      </header>
      <NewCaseForm bodies={bodies.map((b) => ({ id: b.id, name: b.name }))} settings={settings} />
    </div>
  );
}
