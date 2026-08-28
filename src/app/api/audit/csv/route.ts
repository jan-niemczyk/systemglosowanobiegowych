import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toCsv, csvResponse } from "@/lib/csv";
import { formatDateTime } from "@/lib/labels";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR")
    return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const caseId = url.searchParams.get("case");

  const logs = await prisma.auditLog.findMany({
    where: caseId ? { caseId } : {},
    include: { user: true, case: true },
    orderBy: { createdAt: "asc" },
  });

  const rows: (string | number | null | undefined | boolean)[][] = [
    ["Data", "Akcja", "Opis", "Sprawa", "Użytkownik"],
  ];

  for (const l of logs) {
    rows.push([
      formatDateTime(l.createdAt),
      l.action,
      l.description,
      l.case ? `${l.case.number ? l.case.number + " - " : ""}${l.case.title}` : "",
      l.user ? `${l.user.firstName} ${l.user.lastName}` : "",
    ]);
  }

  const fname = caseId ? `rejestr_${caseId.slice(-8)}.csv` : "rejestr_pelny.csv";
  return csvResponse(fname, toCsv(rows));
}
