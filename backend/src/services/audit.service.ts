import { prisma } from "../config/prisma";

export async function logAudit(params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId || undefined,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details as any,
    },
  });
}
