import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/StatusPill";
import { formatDateTime, CLOSE_MODE_LABEL, RESULTS_VISIBILITY_LABEL } from "@/lib/labels";
import { CaseActions } from "./CaseActions";
import { ParticipantsEditor } from "./ParticipantsEditor";
import { ItemsEditor } from "./ItemsEditor";
import { ItemDocumentsPanel } from "./ItemDocumentsPanel";
import { ItemResult } from "@/components/ItemResult";
import { ReportsPanel } from "./ReportsPanel";

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [kase, bodies, users] = await Promise.all([
    prisma.case.findUnique({
      where: { id },
      include: {
        body: true,
        operator: true,
        participants: { include: { user: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
        items: {
          orderBy: { order: "asc" },
          include: { options: { orderBy: { order: "asc" } }, documents: { orderBy: { uploadedAt: "asc" } } },
        },
      },
    }),
    prisma.body.findMany({ orderBy: { name: "asc" } }),
    // Operator nie może brać udziału w głosowaniu - nie jest kandydatem do składu sprawy.
    prisma.user.findMany({ where: { active: true, role: "PARTICIPANT" }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
  ]);
  if (!kase) notFound();

  const isDraft = kase.status === "DRAFT";
  const isOpen = kase.status === "OPEN";
  const isClosedOrPublished = kase.status === "CLOSED" || kase.status === "RESULTS_PUBLISHED";
  const readiness = {
    hasParticipants: kase.participants.length > 0,
    hasItems: kase.items.length > 0,
  };

  return (
    <div className="px-6 py-8 max-w-[1000px] mx-auto space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow mb-2">Sprawa {kase.number ? `nr ${kase.number}` : ""}</div>
          <h1 style={{ fontSize: 28 }}>{kase.title}</h1>
          {kase.description && <p className="text-sm mt-2 max-w-[560px]" style={{ color: "var(--color-ink-2)" }}>{kase.description}</p>}
          <div className="flex items-center gap-3 mt-3">
            <StatusPill status={kase.status} />
            {kase.body && <span className="text-sm" style={{ color: "var(--color-ink-3)" }}>{kase.body.name}</span>}
          </div>
        </div>
        <CaseActions caseId={kase.id} status={kase.status} readiness={readiness} />
      </header>

      <section className="card-soft p-4 grid sm:grid-cols-2 gap-3 text-sm">
        <Info label="Tryb zakończenia" value={CLOSE_MODE_LABEL[kase.closeMode]} />
        <Info label="Publikacja wyników" value={RESULTS_VISIBILITY_LABEL[kase.resultsVisibility]} />
        <Info label="Zmiana głosu" value={kase.allowVoteChange ? "Dopuszczalna (jawne, do zamknięcia)" : "Niedopuszczalna"} />
        <Info label="Termin końcowy" value={formatDateTime(kase.deadlineAt)} />
        <Info label="Otwarto" value={formatDateTime(kase.openedAt)} />
        <Info label="Zamknięto" value={formatDateTime(kase.closedAt)} />
      </section>

      {isDraft && (!readiness.hasParticipants || !readiness.hasItems) && (
        <div className="card-soft p-4 text-sm" style={{ borderColor: "var(--color-abstain)" }}>
          <div className="font-medium mb-1">Warunki otwarcia sprawy</div>
          <ul className="list-disc pl-5 space-y-0.5">
            <li style={{ color: readiness.hasParticipants ? "var(--color-yes)" : "var(--color-ink)" }}>Co najmniej jeden uczestnik składu {readiness.hasParticipants ? "✓" : ""}</li>
            <li style={{ color: readiness.hasItems ? "var(--color-yes)" : "var(--color-ink)" }}>Co najmniej jedna pozycja głosowania {readiness.hasItems ? "✓" : ""}</li>
          </ul>
        </div>
      )}

      <section>
        <h2 className="text-sm font-medium mb-3">Skład uprawnionych ({kase.participants.length})</h2>
        <ParticipantsEditor
          caseId={kase.id}
          editable={isDraft}
          bodies={bodies.map((b) => ({ id: b.id, name: b.name }))}
          users={users.map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email }))}
          participants={kase.participants.map((p) => ({
            id: p.id, userId: p.userId, hasVotingRight: p.hasVotingRight,
            firstName: p.firstName, lastName: p.lastName, active: p.user.active,
          }))}
        />
      </section>

      <section>
        <h2 className="text-sm font-medium mb-3">Pozycje głosowania ({kase.items.length})</h2>
        {isDraft ? (
          <ItemsEditor
            caseId={kase.id}
            items={kase.items.map((i) => ({
              ...i,
              documents: i.documents.map((d) => ({ ...d, uploadedAt: d.uploadedAt.toISOString() })),
            }))}
          />
        ) : (
          <div className="space-y-3">
            {kase.items.map((item) => (
              <div key={item.id} className="space-y-2">
                <ItemResult item={item} showVoting={isOpen} />
                <ItemDocumentsPanel
                  caseId={kase.id}
                  itemId={item.id}
                  caseStatus={kase.status}
                  documents={item.documents.map((d) => ({ ...d, uploadedAt: d.uploadedAt.toISOString() }))}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {isClosedOrPublished && (
        <section>
          <h2 className="text-sm font-medium mb-3">Wydruki</h2>
          <ReportsPanel caseId={kase.id} items={kase.items.map((i) => ({ id: i.id, title: i.title, visibility: i.visibility }))} />
        </section>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide" style={{ color: "var(--color-ink-3)" }}>{label}</div>
      <div>{value}</div>
    </div>
  );
}
