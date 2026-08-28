import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { BodyMembersEditor } from "./BodyMembersEditor";

export const dynamic = "force-dynamic";

export default async function BodyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [body, users] = await Promise.all([
    prisma.body.findUnique({ where: { id }, include: { members: { include: { user: true }, orderBy: { user: { lastName: "asc" } } } } }),
    // Operator nie może brać udziału w głosowaniu - nie jest kandydatem do składu organu.
    prisma.user.findMany({ where: { active: true, role: "PARTICIPANT" }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
  ]);
  if (!body) notFound();

  return (
    <div className="px-6 py-8 max-w-[700px] mx-auto space-y-6">
      <header>
        <div className="eyebrow mb-2">Organ</div>
        <h1 style={{ fontSize: 28 }}>{body.name}</h1>
        {body.description && <p className="text-sm mt-2" style={{ color: "var(--color-ink-2)" }}>{body.description}</p>}
      </header>

      <section>
        <h2 className="text-sm font-medium mb-3">Skład ({body.members.length})</h2>
        <BodyMembersEditor
          bodyId={body.id}
          members={body.members.map((m) => ({ userId: m.userId, hasVotingRight: m.hasVotingRight, firstName: m.user.firstName, lastName: m.user.lastName, email: m.user.email }))}
          users={users.map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email }))}
        />
      </section>
    </div>
  );
}
