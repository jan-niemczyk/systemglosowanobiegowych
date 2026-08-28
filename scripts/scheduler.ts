/**
 * Harmonogram automatycznego zamykania spraw (sekcja 12 koncepcji - komponent
 * "Harmonogram": cyklicznie sprawdza sprawy, których termin upłynął, i bezpiecznie
 * je zamyka). Uruchamiany jako osobny proces/kontener (patrz docker-compose.yml),
 * niezależny od procesu aplikacji webowej.
 */
import { PrismaClient, CaseStatus, CloseMode } from "@prisma/client";
import { closeCase, haveAllVoted } from "../src/lib/closeCase";

const prisma = new PrismaClient();
const INTERVAL_MS = Number(process.env.SCHEDULER_INTERVAL_SECONDS ?? 60) * 1000;

async function tick() {
  // Upływ terminu - DEADLINE i DEADLINE_OR_ALL_VOTED.
  const dueByDeadline = await prisma.case.findMany({
    where: {
      status: CaseStatus.OPEN,
      closeMode: { in: [CloseMode.DEADLINE, CloseMode.DEADLINE_OR_ALL_VOTED] },
      deadlineAt: { lte: new Date() },
    },
    select: { id: true, title: true },
  });
  for (const kase of dueByDeadline) {
    try {
      await closeCase(kase.id, { reason: "upływ terminu" });
      console.log(`[scheduler] Zamknięto sprawę „${kase.title}” (${kase.id}) - upłynął termin.`);
    } catch (err) {
      console.error(`[scheduler] Błąd zamykania sprawy ${kase.id}:`, err);
    }
  }

  // Awaryjny przebieg dla ALL_VOTED / DEADLINE_OR_ALL_VOTED: normalnie zamknięcie następuje
  // od razu po ostatnim głosie (patrz src/app/api/votes/[itemId]/route.ts), ale gdyby ten
  // request się nie powiódł, sprawa zostałaby otwarta na zawsze bez tego przebiegu.
  const candidatesForAllVoted = await prisma.case.findMany({
    where: { status: CaseStatus.OPEN, closeMode: { in: [CloseMode.ALL_VOTED, CloseMode.DEADLINE_OR_ALL_VOTED] } },
    select: { id: true, title: true },
  });
  for (const kase of candidatesForAllVoted) {
    try {
      if (await haveAllVoted(kase.id)) {
        await closeCase(kase.id, { reason: "wszyscy uprawnieni oddali głos" });
        console.log(`[scheduler] Zamknięto sprawę „${kase.title}” (${kase.id}) - wszyscy uprawnieni oddali głos.`);
      }
    } catch (err) {
      console.error(`[scheduler] Błąd zamykania sprawy ${kase.id}:`, err);
    }
  }
}

let stopped = false;
async function loop() {
  while (!stopped) {
    try {
      await tick();
    } catch (err) {
      console.error("[scheduler] Błąd cyklu:", err);
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

process.on("SIGTERM", () => { stopped = true; prisma.$disconnect(); process.exit(0); });
process.on("SIGINT", () => { stopped = true; prisma.$disconnect(); process.exit(0); });

console.log(`[scheduler] Start - sprawdzanie terminów co ${INTERVAL_MS / 1000}s.`);
loop();
