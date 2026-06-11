import crypto from "node:crypto";
import type { Lead, LeadStatus, Partner } from "@prisma/client";
import { mapCrmStatus } from "@/lib/crm/mapping";

/**
 * Camada de abstração da integração com o CRM.
 *
 * Hoje só existe o CRM próprio da Credios (CrediosCrmAdapter), mas toda a
 * lógica de sync/webhook fala apenas com esta interface — trocar de CRM no
 * futuro é implementar outro adapter.
 */
export interface CRMAdapter {
  createLead(lead: Lead, partner: Partner): Promise<{ crmLeadId: string }>;
  mapStage(crmStageKey: string): LeadStatus | null;
  verifyWebhook(req: Request): Promise<boolean> | boolean;
}

const CRM_REQUEST_TIMEOUT_MS = 15_000;

/** Comparação timing-safe de secrets (hash equaliza length antes do compare). */
function timingSafeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/** Prisma.Decimal → number em REAIS (o webhook do CRM converte pra centavos). */
function decimalToReais(value: Lead["requestedAmount"]): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Monta o payload no formato EXATO do webhookLeadPayloadSchema do CRM
 * (credios-crm/src/lib/validators/webhook.ts). Pontos de atenção:
 *
 * - Valores monetários em REAIS — o CRM converte pra centavos no insert.
 * - NÃO enviar `lead_id`: no CRM esse campo é a chave de ENRIQUECIMENTO
 *   (uuid de lead existente, fluxo 2 etapas do simulador). O id do portal
 *   vai como `portal_lead_id` (campo passthrough, preservado em raw_payload).
 * - O schema do CRM NÃO tem campo de observações/notas no lead. Decisão
 *   documentada em docs/INTEGRACAO-CRM.md: a identificação do parceiro +
 *   observações vão concatenadas em `objetivo_credito` (campo de texto
 *   visível no detalhe do lead) e também em campos passthrough estruturados
 *   (`observacoes_parceiro`, `portal_partner_*`) preservados em raw_payload.
 * - Tracking: source "Portal de Parceiros" / channel "Referral" / paid false.
 *   Pré-requisito no CRM: source cadastrado na taxonomia + tracking_sources
 *   (ver docs/INTEGRACAO-CRM.md) — sem isso o lead cai na quarantine
 *   "Unknown" (criado mesmo assim, só perde a classificação de origem).
 */
export function buildCrmLeadPayload(
  lead: Lead,
  partner: Partner
): Record<string, unknown> {
  const partnerTag = `Indicação via Portal de Parceiros — Parceiro: ${partner.legalName} (portal ${partner.id}${
    partner.crmPartnerRef ? `, CRM ref ${partner.crmPartnerRef}` : ""
  })`;
  const observacoes = lead.notes?.trim()
    ? `Observações do parceiro: ${lead.notes.trim()}`
    : "";

  const uf =
    lead.state && /^[A-Za-z]{2}$/.test(lead.state.trim())
      ? lead.state.trim().toUpperCase()
      : undefined;

  const digits = lead.document.replace(/\D/g, "");
  const tipoPessoa =
    digits.length === 11
      ? "Pessoa Física"
      : digits.length === 14
        ? "Pessoa Jurídica"
        : undefined;

  return {
    // ── Dados pessoais (nomes/unidades do webhookLeadPayloadSchema) ──────
    nome: lead.name,
    // CPF: o CRM normaliza e descarta se não tiver 11 dígitos (CNPJ vira
    // null lá — o documento completo segue em portal_client_document).
    cpf: digits.length === 11 ? digits : "",
    whatsapp: lead.phone,
    email: lead.email ?? "",
    cidade: lead.city ?? "",
    ...(uf ? { estado: uf } : {}),
    ...(tipoPessoa ? { tipo_pessoa: tipoPessoa } : {}),

    // ── Operação (valores em REAIS) ──────────────────────────────────────
    produto: lead.product,
    valor_credito: decimalToReais(lead.requestedAmount),
    valor_imovel: decimalToReais(lead.propertyValue),
    objetivo_credito: [partnerTag, observacoes].filter(Boolean).join(". "),

    // ── Tracking canônico (taxonomia channel > source > paid do CRM) ─────
    channel: "Referral",
    source: "Portal de Parceiros",
    paid: false,
    origem: "Portal de Parceiros", // mirror legado, retrocompatibilidade

    // ── Vinculação portal ↔ CRM (passthrough → raw_payload no CRM) ───────
    portal_lead_id: lead.id,
    portal_partner_id: partner.id,
    portal_partner_nome: partner.legalName,
    ...(partner.crmPartnerRef ? { portal_partner_crm_ref: partner.crmPartnerRef } : {}),
    ...(lead.notes ? { observacoes_parceiro: lead.notes } : {}),
    ...(lead.propertyCity ? { portal_property_city: lead.propertyCity } : {}),
    portal_client_document: digits,
  };
}

export class CrediosCrmAdapter implements CRMAdapter {
  /**
   * Cria o lead no CRM via webhook de entrada existente
   * (POST {CRM_BASE_URL}/api/webhooks/lead, header x-webhook-secret).
   * Lança em qualquer falha — retry/log são responsabilidade do caller
   * (src/lib/crm/sync.ts).
   */
  async createLead(lead: Lead, partner: Partner): Promise<{ crmLeadId: string }> {
    const baseUrl = process.env.CRM_BASE_URL;
    const secret = process.env.CRM_WEBHOOK_SECRET;
    if (!baseUrl || !secret) {
      throw new Error("CRM_BASE_URL/CRM_WEBHOOK_SECRET não configurados");
    }

    const endpoint = `${baseUrl.replace(/\/+$/, "")}/api/webhooks/lead`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webhook-secret": secret,
      },
      body: JSON.stringify(buildCrmLeadPayload(lead, partner)),
      signal: AbortSignal.timeout(CRM_REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`CRM respondeu ${res.status}: ${text.slice(0, 500)}`);
    }

    // 201 { leadId, duplicate: false } | 200 { duplicate: true, leadId } |
    // 200 { leadId, enriched: true } — em todos os casos leadId é o vínculo.
    const data = (await res.json()) as { leadId?: string | null };
    if (!data.leadId) {
      throw new Error("CRM não retornou leadId no corpo da resposta");
    }
    return { crmLeadId: data.leadId };
  }

  mapStage(crmStageKey: string): LeadStatus | null {
    return mapCrmStatus(crmStageKey);
  }

  /** Valida o header x-portal-secret do webhook inbound (CRM → portal). */
  verifyWebhook(req: Request): boolean {
    const expected = process.env.PORTAL_WEBHOOK_SECRET;
    const provided = req.headers.get("x-portal-secret");
    if (!expected || !provided) return false;
    return timingSafeCompare(provided, expected);
  }
}

/** Instância única usada por sync.ts e pelo route handler do webhook. */
export const crmAdapter: CRMAdapter = new CrediosCrmAdapter();
