import { prisma } from "@/lib/db";
import type { EventAction } from "@prisma/client";

export async function logEvent(params: {
  action: EventAction;
  description: string;
  caseId?: string;
  userId?: string;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await prisma.eventLog.create({
    data: {
      action: params.action,
      description: params.description,
      caseId: params.caseId,
      userId: params.userId,
      ip: params.ip ?? undefined,
      metadata: params.metadata as never,
    },
  });
}
