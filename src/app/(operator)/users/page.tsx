import { prisma } from "@/lib/db";
import { UsersManager } from "./UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { lastName: "asc" }] });
  return (
    <div className="container py-4 py-md-5 d-flex flex-column gap-4" style={{ maxWidth: 1000 }}>
      <header>
        <div className="eyebrow mb-2">Osoby</div>
        <h1 className="h3 mb-0">Konta użytkowników</h1>
      </header>
      <UsersManager users={users.map((u) => ({
        id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName,
        functionTitle: u.functionTitle, role: u.role, active: u.active,
      }))} />
    </div>
  );
}
