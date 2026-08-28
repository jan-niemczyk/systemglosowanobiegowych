import { PrismaClient, Role, VoteVisibility, CloseMode, ResultsVisibility } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Czysty seed produkcyjny: wyłącznie ustawienia globalne i JEDNO konto operatora.
 * Bez przykładowych osób, organów ani spraw (sekcja 13 koncepcji - brak migracji danych).
 *
 * Konto operatora:
 *   e-mail: SEED_OPERATOR_EMAIL   (domyślnie: operator@sgo.local)
 *   hasło:  SEED_OPERATOR_PASSWORD (WYMAGANE - brak wartości = przerwij, bez tworzenia konta z hasłem domyślnym)
 * Zmień hasło po pierwszym logowaniu.
 */
async function main() {
  await prisma.settings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      organizationName: "Organizacja",
      defaultVoteVisibility: VoteVisibility.OPEN,
      defaultCloseMode: CloseMode.MANUAL,
      defaultResultsVisibility: ResultsVisibility.MANUAL,
      defaultAllowVoteChange: true,
    },
    update: {},
  });

  const email = process.env.SEED_OPERATOR_EMAIL ?? "operator@sgo.local";
  const password = process.env.SEED_OPERATOR_PASSWORD;
  if (!password || password.length < 8) {
    console.error("BŁĄD: ustaw SEED_OPERATOR_PASSWORD (min. 8 znaków). Konto operatora NIE zostało utworzone.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Konto operatora ${email} już istnieje - pomijam (hasło bez zmian).`);
  } else {
    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 10),
        firstName: "Operator",
        lastName: "Systemu",
        role: Role.OPERATOR,
      },
    });
    console.log(`✓ Utworzono konto operatora: ${email}`);
    console.log("  Zaloguj się i zmień hasło w Ustawieniach.");
  }

  console.log("✓ seed zakończony (ustawienia globalne + operator)");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
