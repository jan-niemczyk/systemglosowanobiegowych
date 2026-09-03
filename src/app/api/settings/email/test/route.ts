import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendTestEmail } from "@/lib/mailer";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  user: z.string().min(1),
  // Puste = użyj hasła zapisanego wcześniej w Ustawieniach (pole hasła w formularzu nie jest wypełniane odczytaną wartością).
  password: z.string().optional(),
  secure: z.boolean(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });

  let password = parsed.data.password;
  if (!password) {
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    password = settings?.smtpPassword ?? undefined;
  }
  if (!password) return new NextResponse("Brak zapisanego hasła - podaj hasło, aby przetestować połączenie.", { status: 400 });

  try {
    await sendTestEmail({ ...parsed.data, password }, session.user.email as string);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nieznany błąd";
    return new NextResponse(`Nie udało się wysłać testowej wiadomości: ${message}`, { status: 400 });
  }
}
