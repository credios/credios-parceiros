import { prisma } from "@/lib/prisma";
import { crmAdapter } from "@/lib/crm/adapter";

/**
 * Sync outbound portal → CRM, resiliente por design:
 *
 * - syncLeadToCrm NUNCA lança — falha de integração não pode quebrar o
 *   fluxo de cadastro do lead. O pior caso é crmSyncStatus = FAILED, que
 *   o cron (/api/cron/integrations) e o admin reprocessam depois.
 * - Sem env configurado a integração opera em "modo manual": leads ficam
 *   PENDING e o time trabalha pelo CRM normalmente, sem ruído de logs.
 */

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [500, 2_000, 5_000];
/** PENDING só entra no reprocesso depois desta idade (evita corrida com o sync inline do cadastro). */
const PENDING_MIN_AGE_MS = 2 * 60_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isCrmConfigured(): boolean {
  return Boolean(process.env.CRM_BASE_URL && process.env.CRM_WEBHOOK_SECRET);
}

function crmEndpoint(): string {
  return `${(process.env.CRM_BASE_URL ?? "").replace(/\/+$/, "")}/api/webhooks/lead`;
}

/**
 * Envia um lead do portal pro CRM. Idempotente: lead já sincronizado
 * (crmLeadId presente) só tem o status garantido. Nunca lança.
 */
export async function syncLeadToCrm(leadId: string): Promise<void> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { partner: true },
    });
    if (!lead) return;

    // Modo manual — integração ainda não configurada. Marca PENDING e sai
    // em silêncio (sem IntegrationLog pra não poluir a observabilidade).
    if (!isCrmConfigured()) {
      if (lead.crmSyncStatus !== "PENDING") {
        await prisma.lead.update({
          where: { id: leadId },
          data: { crmSyncStatus: "PENDING" },
        });
      }
      return;
    }

    // Idempotência: já existe no CRM → só garante o status SYNCED.
    if (lead.crmLeadId) {
      if (lead.crmSyncStatus !== "SYNCED") {
        await prisma.lead.update({
          where: { id: leadId },
          data: { crmSyncStatus: "SYNCED" },
        });
      }
      return;
    }

    const endpoint = crmEndpoint();
    let lastError = "erro desconhecido";

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const { crmLeadId } = await crmAdapter.createLead(lead, lead.partner);

        await prisma.lead.update({
          where: { id: leadId },
          data: { crmLeadId, crmSyncStatus: "SYNCED" },
        });
        await prisma.integrationLog.create({
          data: {
            direction: "OUTBOUND",
            endpoint,
            // Só o necessário pra auditar o vínculo — PII fica fora do log.
            payload: {
              portalLeadId: lead.id,
              partnerId: lead.partnerId,
              produto: lead.product,
              source: "Portal de Parceiros",
            },
            response: { leadId: crmLeadId },
            success: true,
            retries: attempt,
          },
        });
        return;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt < MAX_ATTEMPTS - 1) await sleep(BACKOFF_MS[attempt] ?? 5_000);
      }
    }

    // Falha definitiva nesta rodada — cron/admin reprocessam depois.
    await prisma.lead.update({
      where: { id: leadId },
      data: { crmSyncStatus: "FAILED" },
    });
    await prisma.integrationLog.create({
      data: {
        direction: "OUTBOUND",
        endpoint,
        payload: { portalLeadId: lead.id, partnerId: lead.partnerId },
        success: false,
        error: lastError.slice(0, 2000),
        retries: MAX_ATTEMPTS,
      },
    });
  } catch (err) {
    // Última linha de defesa — syncLeadToCrm nunca propaga erro.
    console.error("[crm-sync] erro inesperado ao sincronizar lead:", err);
  }
}

/**
 * Reprocessa leads que não chegaram ao CRM:
 * - FAILED (tentativas anteriores esgotadas), e
 * - PENDING criados há mais de 2 minutos (ficaram pra trás enquanto a
 *   integração estava desconfigurada, ou o sync inline foi interrompido).
 *
 * Sequencial de propósito: não estoura rate limit nem concorre consigo
 * mesmo no claim de idempotência do CRM. Chamado pelo cron a cada 15 min
 * e pelo painel /admin/integracoes.
 */
export async function reprocessFailedSyncs(
  limit = 20
): Promise<{ processed: number; succeeded: number }> {
  if (!isCrmConfigured()) return { processed: 0, succeeded: 0 };

  const pendingCutoff = new Date(Date.now() - PENDING_MIN_AGE_MS);
  const leads = await prisma.lead.findMany({
    where: {
      crmLeadId: null,
      OR: [
        { crmSyncStatus: "FAILED" },
        { crmSyncStatus: "PENDING", createdAt: { lt: pendingCutoff } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });

  let succeeded = 0;
  for (const { id } of leads) {
    await syncLeadToCrm(id);
    const after = await prisma.lead.findUnique({
      where: { id },
      select: { crmSyncStatus: true },
    });
    if (after?.crmSyncStatus === "SYNCED") succeeded++;
  }

  return { processed: leads.length, succeeded };
}
