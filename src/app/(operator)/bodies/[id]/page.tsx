import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { BodyMembersEditor } from "./BodyMembersEditor";
import { BodyHeader } from "./BodyHeader";

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
    <div className="container py-4 py-md-5 d-flex flex-column gap-4" style={{ maxWidth: 700 }}>
      <BodyHeader bodyId={body.id} name={body.name} description={body.description} />

      <section className="card shadow-sm p-4">
        <h2 className="small fw-medium mb-3">Skład ({body.members.length})</h2>
        <BodyMembersEditor
          bodyId={body.id}
          members={body.members.map((m) => ({ userId: m.userId, hasVotingRight: m.hasVotingRight, firstName: m.user.firstName, lastName: m.user.lastName, email: m.user.email }))}
          users={users.map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email }))}
        />
      </section>
    </div>
  );
}
