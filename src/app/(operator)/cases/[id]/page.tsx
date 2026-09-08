import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { CaseSettingsEditor } from "./CaseSettingsEditor";
import { CaseActions } from "./CaseActions";
import { ParticipantsEditor } from "./ParticipantsEditor";
import { ItemsEditor } from "./ItemsEditor";
import { ItemDocumentsPanel } from "./ItemDocumentsPanel";
import { ItemResult } from "@/components/ItemResult";
import { LiveItemPanel, computeLiveTally } from "./LiveItemPanel";
import { ReportsPanel } from "./ReportsPanel";
import { ResolutionEditor } from "./ResolutionEditor";

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
          include: {
            options: { orderBy: { order: "asc" } },
            documents: { orderBy: { uploadedAt: "asc" } },
            ballots: { include: { selections: true } },
            secretMarkers: { select: { userId: true } },
          },
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
    <div className="container py-4 py-md-5 d-flex flex-column gap-4" style={{ maxWidth: 1000 }}>
      <CaseSettingsEditor
        caseId={kase.id}
        status={kase.status}
        title={kase.title}
        number={kase.number}
        description={kase.description}
        bodyId={kase.bodyId}
        bodyName={kase.body?.name ?? null}
        bodies={bodies.map((b) => ({ id: b.id, name: b.name }))}
        closeMode={kase.closeMode}
        resultsVisibility={kase.resultsVisibility}
        allowVoteChange={kase.allowVoteChange}
        deadlineAt={kase.deadlineAt}
        openedAt={kase.openedAt}
        closedAt={kase.closedAt}
      >
        <CaseActions caseId={kase.id} status={kase.status} readiness={readiness} />
      </CaseSettingsEditor>

      {isDraft && (!readiness.hasParticipants || !readiness.hasItems) && (
        <div className="card card-soft p-4 small border-warning-subtle">
          <div className="fw-medium mb-1">Warunki otwarcia sprawy</div>
          <ul className="mb-0 ps-3">
            <li className={readiness.hasParticipants ? "text-vote-yes" : undefined}>Co najmniej jeden uczestnik składu {readiness.hasParticipants ? "✓" : ""}</li>
            <li className={readiness.hasItems ? "text-vote-yes" : undefined}>Co najmniej jedna pozycja głosowania {readiness.hasItems ? "✓" : ""}</li>
          </ul>
        </div>
      )}

      <section className="card shadow-sm p-4">
        <h2 className="small fw-medium mb-3">Skład uprawnionych ({kase.participants.length})</h2>
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

      <section className="card shadow-sm p-4">
        <h2 className="small fw-medium mb-3">Pozycje głosowania ({kase.items.length})</h2>
        {isDraft ? (
          <ItemsEditor
            caseId={kase.id}
            items={kase.items.map((i) => ({
              ...i,
              documents: i.documents.map((d) => ({ ...d, uploadedAt: d.uploadedAt.toISOString() })),
            }))}
          />
        ) : (
          <div className="d-flex flex-column gap-3">
            {kase.items.map((item) => {
              const votedUserIds = item.visibility === "SECRET"
                ? new Set(item.secretMarkers.map((m) => m.userId))
                : new Set(item.ballots.map((b) => b.userId).filter((v): v is string => !!v));
              return (
                <div key={item.id} className="d-flex flex-column gap-2">
                  {isOpen ? (
                    <LiveItemPanel
                      item={item}
                      participants={kase.participants.map((p) => ({ userId: p.userId, firstName: p.firstName, lastName: p.lastName, hasVotingRight: p.hasVotingRight }))}
                      votedUserIds={votedUserIds}
                      tally={computeLiveTally(item, item.ballots)}
                    />
                  ) : (
                    <>
                      <ItemResult item={item} />
                      {isClosedOrPublished && (
                        <ResolutionEditor caseId={kase.id} itemId={item.id} resolution={item.resolution} />
                      )}
                    </>
                  )}
                  <ItemDocumentsPanel
                    caseId={kase.id}
                    itemId={item.id}
                    documents={item.documents.map((d) => ({ ...d, uploadedAt: d.uploadedAt.toISOString() }))}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {isClosedOrPublished && (
        <section className="card shadow-sm p-4">
          <h2 className="small fw-medium mb-3">Wydruki</h2>
          <ReportsPanel caseId={kase.id} items={kase.items.map((i) => ({ id: i.id, title: i.title }))} />
        </section>
      )}
    </div>
  );
}
