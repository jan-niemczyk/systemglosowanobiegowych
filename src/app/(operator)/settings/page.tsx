import { prisma } from "@/lib/db";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await prisma.settings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
  return (
    <div className="px-6 py-8 max-w-[640px] mx-auto space-y-6">
      <header>
        <div className="eyebrow mb-2">Konfiguracja</div>
        <h1 style={{ fontSize: 28 }}>Ustawienia organizacji</h1>
      </header>
      <SettingsForm settings={settings} />
    </div>
  );
}
