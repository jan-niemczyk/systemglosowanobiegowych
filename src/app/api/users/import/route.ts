import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/eventLog";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

/**
 * POST /api/users/import
 * Body: { rows: [{ firstName, lastName, email, role? }] }
 *
 * Tworzy użytkowników z losowymi hasłami. Zwraca tabelę z hasłami (jednorazowo!)
 * - operator ma je przekazać uczestnikom.
 */

const rowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["OPERATOR", "PARTICIPANT"]).optional(),
});

const schema = z.object({
  rows: z.array(rowSchema).min(1),
});

function randomPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < 10; i++) {
    p += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return p;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR")
    return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });

  const results: { email: string; name: string; password: string | null; status: "created" | "skipped" | "error"; error?: string }[] = [];

  for (const row of parsed.data.rows) {
    try {
      const existing = await prisma.user.findUnique({ where: { email: row.email } });
      if (existing) {
        results.push({
          email: row.email,
          name: `${row.firstName} ${row.lastName}`,
          password: null,
          status: "skipped",
          error: "Email już istnieje",
        });
        continue;
      }

      const password = randomPassword();
      const passwordHash = await bcrypt.hash(password, 10);

      await prisma.user.create({
        data: {
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          passwordHash,
          role: row.role ?? "PARTICIPANT",
          active: true,
        },
      });

      results.push({
        email: row.email,
        name: `${row.firstName} ${row.lastName}`,
        password,
        status: "created",
      });
    } catch (e) {
      results.push({
        email: row.email,
        name: `${row.firstName} ${row.lastName}`,
        password: null,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const createdCount = results.filter((r) => r.status === "created").length;
  await logEvent({
    action: "SETTINGS_CHANGED",
    description: `Import użytkowników: utworzono ${createdCount} z ${parsed.data.rows.length}`,
    userId: session.user.id,
    metadata: { totalRows: parsed.data.rows.length, createdCount },
  });

  return NextResponse.json({ results });
}
