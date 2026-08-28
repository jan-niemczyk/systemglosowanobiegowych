import { prisma } from "@/lib/db";
import type { AuditAction } from "@prisma/client";

export async function audit(params: {
  action: AuditAction;
  description: string;
  caseId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      description: params.description,
      caseId: params.caseId,
      userId: params.userId,
      metadata: params.metadata as never,
    },
  });
}
