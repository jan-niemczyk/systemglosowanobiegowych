import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { StatusPill } from "@/components/StatusPill";
import { formatDateTime, DOCUMENT_KIND_LABEL } from "@/lib/labels";
import { VotingItemCard } from "./VotingItemCard";
import { ItemResult } from "@/components/ItemResult";

export const dynamic = "force-dynamic";

export default async function MyCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const participant = await prisma.caseParticipant.findUnique({ where: { caseId_userId: { caseId: id, userId } } });
  if (!participant) notFound();

  const kase = await prisma.case.findUnique({
    where: { id },
    include: {
      body: true,
      items: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } },
      documents: { orderBy: { uploadedAt: "asc" } },
    },
  });
  if (!kase || kase.status === "DRAFT") notFound();

  const visibleDocs = kase.documents.filter((d) => {
    if (d.kind === "RESULT") return kase.status === "CLOSED" || kase.status === "RESULTS_PUBLISHED";
    return true;
  });

  const [ballots, markers] = await Promise.all([
    prisma.ballot.findMany({ where: { itemId: { in: kase.items.map((i) => i.id) }, userId }, include: { selections: true } }),
    prisma.secretBallotMarker.findMany({ where: { itemId: { in: kase.items.map((i) => i.id) }, userId } }),
  ]);
  const ballotByItem = new Map(ballots.map((b) => [b.itemId, b]));
  const votedSecretItemIds = new Set(markers.map((m) => m.itemId));

  const resultsVisible = kase.status === "RESULTS_PUBLISHED";

  return (
    <div className="px-6 py-8 max-w-[720px] mx-auto space-y-8">
      <header>
        <div className="eyebrow mb-2">Sprawa {kase.number ? `nr ${kase.number}` : ""}</div>
        <h1 style={{ fontSize: 26 }}>{kase.title}</h1>
        {kase.description && <p className="text-sm mt-2" style={{ color: "var(--color-ink-2)" }}>{kase.description}</p>}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <StatusPill status={kase.status} />
          {kase.body && <span className="text-sm" style={{ color: "var(--color-ink-3)" }}>{kase.body.name}</span>}
          {kase.deadlineAt && <span className="text-sm" style={{ color: "var(--color-ink-3)" }}>Termin: {formatDateTime(kase.deadlineAt)}</span>}
          {!participant.hasVotingRight && <span className="pill pill-neutral">Bez prawa głosu w tej sprawie</span>}
        </div>
      </header>

      {visibleDocs.length > 0 && (
        <section>
          <h2 className="text-sm font-medium mb-3">Dokumenty</h2>
          <ul className="space-y-1 text-sm">
            {visibleDocs.map((d) => (
              <li key={d.id}>
                <a className="underline" href={`/api/documents/${d.id}`}>{d.fileName}</a>
                <span className="ml-2 text-xs" style={{ color: "var(--color-ink-3)" }}>({DOCUMENT_KIND_LABEL[d.kind]})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-medium">Pozycje głosowania</h2>
        {kase.items.map((item) => {
          if (kase.status === "OPEN" && item.status === "OPEN" && participant.hasVotingRight) {
            const ballot = ballotByItem.get(item.id);
            return (
              <VotingItemCard
                key={item.id}
                item={{
                  id: item.id, order: item.order, title: item.title, description: item.description,
                  type: item.type, visibility: item.visibility,
                  minSelections: item.minSelections, maxSelections: item.maxSelections,
                  options: item.options.map((o) => ({ id: o.id, label: o.label, description: o.description })),
                }}
                allowVoteChange={kase.allowVoteChange}
                alreadyVoted={item.visibility === "SECRET" ? votedSecretItemIds.has(item.id) : !!ballot}
                myChoice={ballot?.choice ?? null}
                mySelectedOptionIds={ballot ? ballot.selections.map((s) => s.optionId) : []}
                myPackageChoices={ballot ? ballot.selections.filter((s) => s.choice != null).map((s) => ({ optionId: s.optionId, choice: s.choice! })) : []}
              />
            );
          }
          if (resultsVisible) {
            return <ItemResult key={item.id} item={item} />;
          }
          // zamknięte, wyniki jeszcze nieopublikowane albo brak prawa głosu - tylko potwierdzenie własnego udziału
          const voted = item.visibility === "SECRET" ? votedSecretItemIds.has(item.id) : !!ballotByItem.get(item.id);
          return (
            <div key={item.id} className="card-soft p-4">
              <div className="font-medium text-sm">{item.order}. {item.title}</div>
              <div className="text-sm mt-2" style={{ color: "var(--color-ink-3)" }}>
                {item.status !== "OPEN" && kase.status !== "OPEN" && !resultsVisible && "Głosowanie zakończone, oczekuje na publikację wyników. "}
                {participant.hasVotingRight ? (voted ? "Twój głos został oddany." : "Nie oddano głosu.") : ""}
              </div>
            </div>
          );
        })}
      </section>

      {(kase.status === "CLOSED" || kase.status === "RESULTS_PUBLISHED") && (
        <section>
          <a className="btn btn-sm" href={`/api/cases/${kase.id}/confirmation`}>Pobierz potwierdzenie udziału (PDF)</a>
        </section>
      )}
    </div>
  );
}
