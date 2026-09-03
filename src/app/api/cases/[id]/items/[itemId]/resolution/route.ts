import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CaseStatus } from "@prisma/client";

const schema = z.object({
  resolution: z.string().max(5000).nullable(),
});

/** PATCH .../resolution - treść rozstrzygnięcia, wpisywana przez operatora dopiero po zamknięciu sprawy (drukowana w Protokole). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id, itemId } = await ctx.params;

  const kase = await prisma.case.findUnique({ where: { id }, select: { status: true } });
  if (!kase) return new NextResponse("Not found", { status: 404 });
  if (kase.status !== CaseStatus.CLOSED && kase.status !== CaseStatus.RESULTS_PUBLISHED) {
    return new NextResponse("Rozstrzygnięcie można wprowadzić dopiero po zamknięciu sprawy", { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });

  await prisma.votingItem.update({ where: { id: itemId }, data: { resolution: parsed.data.resolution } });
  return NextResponse.json({ ok: true });
}
