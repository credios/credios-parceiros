import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Notifica o CRM que um parceiro ASSINOU o contrato (status ACTIVE) —
 * o pipeline de relacionamento de lá marca o parceiro como "ativo".
 *
 * Fire-and-forget: falha vira IntegrationLog + console.error, nunca exceção.
 * Mesmo canal do sync de leads: POST {CRM_BASE_URL}/api/webhooks/parceiro
 * com x-webhook-secret (CRM_WEBHOOK_SECRET). Sem envs → no-op silencioso.
 */
export async function notifyCrmPartnerActivated(partner: {
  id: string;
  legalName: string;
  crmPartnerRef: string | null;
}): Promise<void> {
  const baseUrl = process.env.CRM_BASE_URL;
  const secret = process.env.CRM_WEBHOOK_SECRET;
  if (!baseUrl || !secret) return;

  const payload = {
    event: "partner.activated" as const,
    portal_partner_id: partner.id,
    crm_parceiro_ref: partner.crmPartnerRef,
    legal_name: partner.legalName,
  };

  try {
    const res = await fetch(`${baseUrl}/api/webhooks/parceiro`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webhook-secret": secret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as Prisma.InputJsonValue;
    await prisma.integrationLog.create({
      data: {
        direction: "OUTBOUND",
        endpoint: "/api/webhooks/parceiro (CRM)",
        payload,
        response: body,
        success: res.ok,
        error: res.ok ? null : `HTTP ${res.status}`,
      },
    });
  } catch (err) {
    console.error("[crm] notifyCrmPartnerActivated falhou:", err);
    await prisma.integrationLog
      .create({
        data: {
          direction: "OUTBOUND",
          endpoint: "/api/webhooks/parceiro (CRM)",
          payload,
          success: false,
          error: err instanceof Error ? err.message.slice(0, 2000) : "erro",
        },
      })
      .catch(() => {});
  }
}
