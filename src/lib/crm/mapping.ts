import type { LeadStatus } from "@prisma/client";

/**
 * Mapeamento status interno do CRM → status público do portal.
 *
 * O funil do CRM (9 status de trabalho do consultor) é mais GROSSO que o
 * funil do portal (10 status voltados à expectativa do parceiro). Por isso:
 *
 * - AVALIACAO_IMOVEL, APROVADO e CONTRATACAO não têm equivalente no CRM —
 *   são etapas que o admin do portal pode setar MANUALMENTE sem conflito:
 *   o webhook inbound só ajusta o status quando o CRM avançar para um
 *   status mapeado DIFERENTE do atual (ex.: lead em AVALIACAO_IMOVEL
 *   permanece assim enquanto o CRM seguir em "em_negociacao" → EM_BANCO
 *   só seria regressão se aplicado de novo; como o route ignora transição
 *   para o mesmo status mapeado e o CRM não re-dispara o mesmo status,
 *   o ajuste manual sobrevive até o CRM mudar de fato).
 * - Status CUSTOM criados pelo admin do CRM (o campo é text livre lá)
 *   retornam null e são ignorados sem erro pelo webhook.
 */
export const CRM_TO_PORTAL_STATUS: Record<string, LeadStatus> = {
  novo: "RECEBIDO",
  conversa_inicial: "EM_ANALISE",
  aguardando_resposta: "EM_ANALISE",
  aguardando_documentacao: "DOCUMENTACAO",
  documentacao_enviada: "EM_BANCO",
  em_negociacao: "EM_BANCO",
  fechado: "LIBERADO",
  desqualificado: "RECUSADO",
  perdido: "CANCELADO",
  // Pseudo-status: enviado pelo CRM quando o lead é APAGADO lá (teste,
  // duplicado, inválido). O portal preserva o registro fora do funil.
  excluido: "EXCLUIDO",
};

/**
 * Converte um status do CRM no status público do portal.
 * Retorna null para status desconhecidos/custom — o caller deve ignorar
 * silenciosamente (não é erro).
 */
export function mapCrmStatus(key: string): LeadStatus | null {
  return CRM_TO_PORTAL_STATUS[key] ?? null;
}
