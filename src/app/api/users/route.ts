import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyAccountsCreated } from "@/lib/notifications";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

const schema = z.object({
  email: z.string().email().toLowerCase(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  functionTitle: z.string().max(120).nullable().optional(),
  role: z.nativeEnum(Role).default(Role.PARTICIPANT),
  password: z.string().min(6).max(200),
  active: z.boolean().optional().default(true),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR")
    return new NextResponse("Unauthorized", { status: 401 });
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { lastName: "asc" }],
  });
  return NextResponse.json(users.map((u) => ({
    id: u.id, email: u.email,
    firstName: u.firstName, lastName: u.lastName,
    functionTitle: u.functionTitle,
    role: u.role, active: u.active,
  })));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR")
    return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return new NextResponse("Użytkownik z tym e-mailem już istnieje", { status: 400 });

  const u = await prisma.user.create({
    data: {
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      functionTitle: parsed.data.functionTitle ?? null,
      role: parsed.data.role,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      active: parsed.data.active ?? true,
    },
  });
  if (u.active) {
    await notifyAccountsCreated([{ email: u.email, firstName: u.firstName, password: parsed.data.password }]);
  }
  return NextResponse.json({ ok: true, id: u.id });
}
