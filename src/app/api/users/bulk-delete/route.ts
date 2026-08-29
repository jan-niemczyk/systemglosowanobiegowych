import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/eventLog";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  userIds: z.array(z.string()).min(1),
});

/**
 * POST /api/users/bulk-delete
 * Hurtowe usuwanie kont. Chroni historię:
 *  - jeśli konto ma jakikolwiek ślad w głosowaniach/sprawach (ballot, marker,
 *    udział w sprawie) → konto jest DEZAKTYWOWANE (active=false), nie usuwane fizycznie.
 *  - jeśli konto jest "czyste" (brak powiązań) → usuwane fizycznie.
 * Snapshoty (imię/nazwisko) w ballotach i migawkach składu i tak zostają,
 * więc raporty pozostają spójne nawet po dezaktywacji.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR")
    return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new NextResponse(`Bad: ${parsed.error.message}`, { status: 400 });

  const targets = await prisma.user.findMany({
    where: { id: { in: parsed.data.userIds }, role: { not: "OPERATOR" } },
    select: { id: true },
  });

  let deleted = 0;
  let deactivated = 0;

  for (const u of targets) {
    const [ballotCount, markerCount, participationCount] = await Promise.all([
      prisma.ballot.count({ where: { userId: u.id } }),
      prisma.secretBallotMarker.count({ where: { userId: u.id } }),
      prisma.caseParticipant.count({ where: { userId: u.id } }),
    ]);
    const hasHistory = ballotCount + markerCount + participationCount > 0;

    if (hasHistory) {
      await prisma.$transaction([
        prisma.bodyMembership.deleteMany({ where: { userId: u.id } }),
        prisma.user.update({ where: { id: u.id }, data: { active: false } }),
      ]);
      deactivated++;
    } else {
      await prisma.user.delete({ where: { id: u.id } });
      deleted++;
    }
  }

  await logEvent({
    action: "SETTINGS_CHANGED",
    description: `Hurtowe usuwanie kont: usunięto ${deleted}, dezaktywowano ${deactivated} (z historią)`,
    userId: session.user.id,
    metadata: { requested: parsed.data.userIds.length, deleted, deactivated },
  });

  return NextResponse.json({ ok: true, deleted, deactivated });
}
