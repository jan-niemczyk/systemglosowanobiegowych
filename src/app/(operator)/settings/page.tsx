import { prisma } from "@/lib/db";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await prisma.settings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
  return (
    <div className="container py-4 py-md-5 d-flex flex-column gap-4" style={{ maxWidth: 640 }}>
      <header>
        <div className="eyebrow mb-2">Konfiguracja</div>
        <h1 className="h3 mb-0">Ustawienia organizacji</h1>
      </header>
      <SettingsForm settings={settings} />
    </div>
  );
}
