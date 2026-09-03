import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/eventLog";
import { NextResponse } from "next/server";
import { z } from "zod";
import { VoteVisibility, CloseMode, ResultsVisibility } from "@prisma/client";

const schema = z.object({
  organizationName: z.string().min(1).max(200).optional(),
  defaultVoteVisibility: z.nativeEnum(VoteVisibility).optional(),
  defaultCloseMode: z.nativeEnum(CloseMode).optional(),
  defaultResultsVisibility: z.nativeEnum(ResultsVisibility).optional(),
  defaultAllowVoteChange: z.boolean().optional(),
  maxDocumentSizeMB: z.number().int().min(1).max(200).optional(),
  allowedDocumentTypes: z.array(z.string().min(1).max(10)).optional(),
  emailEnabled: z.boolean().optional(),
  smtpHost: z.string().max(255).nullable().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().max(255).nullable().optional(),
  smtpPassword: z.string().max(500).nullable().optional(),
  smtpSecure: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return new NextResponse("Unauthorized", { status: 401 });
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" }, create: { id: "singleton" }, update: {},
  });
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR")
    return new NextResponse("Unauthorized", { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new NextResponse(`Bad request: ${parsed.error.message}`, { status: 400 });

  await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...parsed.data },
    update: parsed.data,
  });

  await logEvent({
    action: "SETTINGS_CHANGED",
    description: "Zmieniono ustawienia globalne",
    userId: session.user.id,
    metadata: { changes: parsed.data },
  });

  return NextResponse.json({ ok: true });
}
