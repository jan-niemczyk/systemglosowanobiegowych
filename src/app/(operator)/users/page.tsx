import { prisma } from "@/lib/db";
import { UsersManager } from "./UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { lastName: "asc" }] });
  return (
    <div className="px-6 py-8 max-w-[1000px] mx-auto space-y-6">
      <header>
        <div className="eyebrow mb-2">Osoby</div>
        <h1 style={{ fontSize: 28 }}>Konta użytkowników</h1>
      </header>
      <UsersManager users={users.map((u) => ({
        id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName,
        functionTitle: u.functionTitle, role: u.role, active: u.active,
      }))} />
    </div>
  );
}
