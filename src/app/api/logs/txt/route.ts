import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { txtResponse } from "@/lib/txt";
import { formatDateTimeSeconds } from "@/lib/labels";
import { NextResponse } from "next/server";

/**
 * GET /api/logs/txt - pełny dziennik zdarzeń (sprawy, organy, ustawienia, głosy,
 * logowania uczestników) jako zwykły tekst, generowany na żądanie - jedyna forma
 * eksportu tego dziennika (brak przeglądarkowej tabeli/rejestru w UI).
 */
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });

  const logs = await prisma.eventLog.findMany({
    orderBy: { createdAt: "asc" },
    include: { user: true, case: true },
  });

  const lines = logs.map((l) => {
    const parts = [
      formatDateTimeSeconds(l.createdAt),
      l.action.padEnd(20),
      l.description,
    ];
    if (l.case) parts.push(`sprawa: ${l.case.number ? l.case.number + " - " : ""}${l.case.title}`);
    if (l.user) parts.push(`użytkownik: ${l.user.lastName} ${l.user.firstName}`);
    if (l.ip) parts.push(`IP: ${l.ip}`);
    return parts.join("  |  ");
  });

  const content = lines.length > 0 ? lines.join("\r\n") + "\r\n" : "Brak zdarzeń.\r\n";
  return txtResponse("dziennik-zdarzen.txt", content);
}
