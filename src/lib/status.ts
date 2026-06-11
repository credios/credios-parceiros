import type { LeadStatus } from "@prisma/client";

export type StatusTone = "neutral" | "info" | "warning" | "success" | "danger" | "gold";

export interface StatusMeta {
  /** Posição no funil (1-based). Terminais compartilham a última posição. */
  order: number;
  label: string;
  /** Microcópia exibida na timeline — linguagem humana, sem jargão. */
  description: string;
  /** Expectativa de prazo típico exibida na etapa atual. */
  typicalTime?: string;
  tone: StatusTone;
  terminal: boolean;
  /** Marcos que disparam email ao parceiro (não spamar micro-etapas). */
  notifyPartner: boolean;
}

export const STATUS_META: Record<LeadStatus, StatusMeta> = {
  RECEBIDO: {
    order: 1,
    label: "Indicação recebida",
    description:
      "Recebemos a indicação. Nossa equipe entra em contato com o cliente em até 1 dia útil.",
    typicalTime: "até 1 dia útil",
    tone: "info",
    terminal: false,
    notifyPartner: false,
  },
  EM_ANALISE: {
    order: 2,
    label: "Em análise",
    description:
      "Estamos conversando com o cliente e analisando o perfil da operação: valor, imóvel e capacidade de pagamento.",
    typicalTime: "2 a 5 dias úteis",
    tone: "info",
    terminal: false,
    notifyPartner: false,
  },
  DOCUMENTACAO: {
    order: 3,
    label: "Documentação",
    description:
      "Coletando e conferindo os documentos do cliente e do imóvel antes de enviar aos bancos.",
    typicalTime: "3 a 10 dias úteis",
    tone: "info",
    terminal: false,
    notifyPartner: false,
  },
  AVALIACAO_IMOVEL: {
    order: 4,
    label: "Avaliação do imóvel",
    description:
      "O imóvel está sendo avaliado por engenheiro credenciado. O laudo define o valor de garantia.",
    typicalTime: "5 a 10 dias úteis",
    tone: "info",
    terminal: false,
    notifyPartner: false,
  },
  EM_BANCO: {
    order: 5,
    label: "Proposta no banco",
    description:
      "A proposta foi enviada às instituições parceiras. Negociamos as melhores condições para o cliente.",
    typicalTime: "5 a 15 dias úteis",
    tone: "warning",
    terminal: false,
    notifyPartner: true,
  },
  APROVADO: {
    order: 6,
    label: "Crédito aprovado",
    description:
      "O crédito foi aprovado! Agora a operação entra em formalização: contrato e registro da garantia.",
    typicalTime: "10 a 20 dias úteis",
    tone: "success",
    terminal: false,
    notifyPartner: true,
  },
  CONTRATACAO: {
    order: 7,
    label: "Contratação",
    description:
      "Assinatura do contrato, cartório e registro da alienação fiduciária em andamento.",
    typicalTime: "10 a 20 dias úteis",
    tone: "success",
    terminal: false,
    notifyPartner: false,
  },
  LIBERADO: {
    order: 8,
    label: "Crédito liberado",
    description:
      "O crédito foi liberado na conta do cliente. Sua comissão foi gerada e já aparece como a receber.",
    tone: "gold",
    terminal: true,
    notifyPartner: true,
  },
  RECUSADO: {
    order: 8,
    label: "Não aprovada",
    description:
      "A operação não foi aprovada nas instituições parceiras. Agradecemos a indicação — o próximo cliente pode ter outro resultado.",
    tone: "danger",
    terminal: true,
    notifyPartner: true,
  },
  CANCELADO: {
    order: 8,
    label: "Cancelada",
    description: "A operação foi encerrada sem conclusão.",
    tone: "neutral",
    terminal: true,
    notifyPartner: false,
  },
  EXCLUIDO: {
    order: 8,
    label: "Excluída",
    description:
      "Esta indicação foi removida do funil pela Credios — em geral um registro de teste, duplicado ou inválido. O mesmo cliente pode ser indicado novamente.",
    tone: "neutral",
    terminal: true,
    notifyPartner: false,
  },
};

/** Etapas do funil feliz, em ordem — usadas na timeline. */
export const FUNNEL_STEPS: LeadStatus[] = [
  "RECEBIDO",
  "EM_ANALISE",
  "DOCUMENTACAO",
  "AVALIACAO_IMOVEL",
  "EM_BANCO",
  "APROVADO",
  "CONTRATACAO",
  "LIBERADO",
];

export const TERMINAL_STATUSES: LeadStatus[] = [
  "LIBERADO",
  "RECUSADO",
  "CANCELADO",
  "EXCLUIDO",
];

export const ACTIVE_STATUSES: LeadStatus[] = FUNNEL_STEPS.filter(
  (s) => !TERMINAL_STATUSES.includes(s)
);

export function isTerminal(status: LeadStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Classes de badge por tom — tokens semânticos do globals.css. */
export const TONE_BADGE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-neutral-100 text-neutral-600",
  info: "bg-status-info-bg text-status-info",
  warning: "bg-status-warning-bg text-status-warning",
  success: "bg-status-success-bg text-status-success",
  danger: "bg-status-danger-bg text-status-danger",
  gold: "bg-credios-gold-100 text-credios-gold-900",
};
