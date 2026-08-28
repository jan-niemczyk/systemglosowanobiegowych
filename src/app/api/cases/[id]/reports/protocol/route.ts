import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateProtocolDocx } from "@/lib/generateProtocol";
import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;

  const kase = await prisma.case.findUnique({
    where: { id },
    include: {
      body: true,
      participants: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
      items: {
        orderBy: { order: "asc" },
        include: {
          options: { orderBy: { order: "asc" } },
          ballots: { include: { selections: true } },
          secretMarkers: { select: { userId: true } },
        },
      },
    },
  });
  if (!kase) return new NextResponse("Not found", { status: 404 });

  const settings = await prisma.settings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
  const buffer = await generateProtocolDocx(kase, settings.organizationName);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="protokol-${id.slice(-8)}.docx"`,
      "Cache-Control": "no-store",
    },
  });
}
