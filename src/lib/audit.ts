import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** Auditoria de ações administrativas sensíveis. Nunca quebra o fluxo. */
export async function logAdminAction(opts: {
  actorId: string;
  action:
    | "LEAD_STATUS_CHANGED"
    | "LEAD_REASSIGNED"
    | "LEAD_DELETED"
    | "COMMISSION_PAID"
    | "COMMISSION_CANCELLED"
    | "PARTNER_CREATED"
    | "PARTNER_UPDATED"
    | "PARTNER_RATE_CHANGED"
    | "PARTNER_SUSPENDED"
    | "PARTNER_REACTIVATED"
    | "INVITE_RESENT"
    | "CONTRACT_RESENT"
    | "CONTRACT_ADMIN_SIGNED"
    | "TEMPLATE_UPDATED"
    | "INTEGRATION_REPROCESSED";
  entity: "Lead" | "Commission" | "Partner" | "Contract" | "ContractTemplate" | "IntegrationLog";
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: opts.actorId,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        metadata: opts.metadata,
      },
    });
  } catch (err) {
    console.error("[audit] falha ao registrar:", err);
  }
}
