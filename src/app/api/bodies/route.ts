import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const bodies = await prisma.body.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true, cases: true } } },
  });
  return NextResponse.json(bodies.map((b) => ({
    id: b.id, name: b.name, description: b.description,
    memberCount: b._count.members, caseCount: b._count.cases,
  })));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });

  const existing = await prisma.body.findUnique({ where: { name: parsed.data.name } });
  if (existing) return new NextResponse("Organ o tej nazwie już istnieje", { status: 400 });

  const body = await prisma.body.create({ data: { name: parsed.data.name, description: parsed.data.description ?? null } });
  await audit({ action: "BODY_CREATED", description: `Utworzono organ „${body.name}”`, userId: session.user.id });
  return NextResponse.json({ ok: true, id: body.id });
}
