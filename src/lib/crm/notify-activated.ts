import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildCrmPartnerPayload } from "@/lib/crm/adapter";

/**
 * Sincroniza um PARCEIRO com o CRM (evento `partner.synced`) — o CRM faz
 * upsert por portal_partner_id: cria/enriquece o registro e mapeia o status
 * do portal para o estágio do pipeline de parceria (INVITED/PENDING_CONTRACT →
 * "convidado_portal", ACTIVE → "ativo").
 *
 * Chamado na criação do parceiro (aparece no CRM como convidado) e na
 * assinatura do contrato (vira ativo). Também é a base do script de
 * reconciliação (prisma/reconcile-partners-to-crm.ts).
 *
 * Fire-and-forget: falha vira IntegrationLog + console.error, nunca exceção.
 * Mesmo canal do sync de leads: POST {CRM_BASE_URL}/api/webhooks/parceiro com
 * x-webhook-secret (CRM_WEBHOOK_SECRET). Sem envs → no-op silencioso.
 *
 * @returns true se o CRM respondeu 2xx; false em qualquer outra situação
 *          (usado pelo relatório do script de reconciliação).
 */
export async function syncPartnerToCrm(partnerId: string): Promise<boolean> {
  const baseUrl = process.env.CRM_BASE_URL;
  const secret = process.env.CRM_WEBHOOK_SECRET;
  if (!baseUrl || !secret) return false;

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: { manager: true },
  });
  if (!partner) return false;

  const payload = buildCrmPartnerPayload(partner, partner.manager?.name ?? null);

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
        payload: payload as Prisma.InputJsonValue,
        response: body,
        success: res.ok,
        error: res.ok ? null : `HTTP ${res.status}`,
      },
    });
    return res.ok;
  } catch (err) {
    console.error("[crm] syncPartnerToCrm falhou:", err);
    await prisma.integrationLog
      .create({
        data: {
          direction: "OUTBOUND",
          endpoint: "/api/webhooks/parceiro (CRM)",
          payload: payload as Prisma.InputJsonValue,
          success: false,
          error: err instanceof Error ? err.message.slice(0, 2000) : "erro",
        },
      })
      .catch(() => {});
    return false;
  }
}
