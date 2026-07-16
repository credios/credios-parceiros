import type { Partner } from "@prisma/client";
import { CREDIOS, PROGRAMA } from "@/lib/credios";
import { formatDocument, formatPhone } from "@/lib/format";

/**
 * Merge da minuta de contrato: substitui os merge fields do template
 * (src/lib/contracts/template-v2.ts / ContractTemplate.bodyHtml) pelos
 * dados reais do parceiro e da Credios.
 */

export interface MergeData {
  partner: Partner;
  /** Taxa formatada pt-BR, ex.: "2,00". */
  rate: string;
  /** Data por extenso, ex.: "11 de junho de 2026" — use formatDateExtenso(). */
  date: string;
  /** Código público de verificação, ex.: CRD-7K2M-9XQ4. */
  verifyCode: string;
}

const MESES_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

/** Data por extenso pt-BR no fuso de Brasília: "11 de junho de 2026". */
export function formatDateExtenso(d: Date): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(d);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return `${get("day")} de ${MESES_PT[get("month") - 1]} de ${get("year")}`;
}

const DIGITOS_EXTENSO: Record<string, string> = {
  "0": "zero",
  "1": "um",
  "2": "dois",
  "3": "três",
  "4": "quatro",
  "5": "cinco",
  "6": "seis",
  "7": "sete",
  "8": "oito",
  "9": "nove",
  ",": "vírgula",
  ".": "vírgula",
};

/**
 * Conversão simples dígito a dígito da taxa para extenso:
 * "2,00" → "dois vírgula zero zero por cento".
 */
export function rateExtenso(rate: string): string {
  const palavras = rate
    .trim()
    .split("")
    .map((ch) => DIGITOS_EXTENSO[ch])
    .filter(Boolean);
  return `${palavras.join(" ")} por cento`;
}

/** Cláusula de representação legal — só para PJ com representante cadastrado. */
function repClause(partner: Partner): string {
  if (partner.personType !== "PJ" || !partner.repName) return "";
  const doc = partner.repDocument
    ? `, CPF ${formatDocument(partner.repDocument)}`
    : "";
  return `, neste ato representada por seu representante legal ${partner.repName}${doc}`;
}

/** Substitui todos os merge fields da minuta pelos dados reais. */
export function mergeTemplate(bodyHtml: string, data: MergeData): string {
  const { partner } = data;
  const fields: Record<string, string> = {
    "partner.legalName": partner.legalName,
    "partner.document": formatDocument(partner.document),
    "partner.email": partner.email,
    "partner.phone": formatPhone(partner.phone),
    "partner.repClause": repClause(partner),
    "credios.razaoSocial": CREDIOS.razaoSocial,
    "credios.cnpj": CREDIOS.cnpj,
    "credios.endereco": CREDIOS.endereco,
    "commission.rate": data.rate,
    "commission.rateExtenso": rateExtenso(data.rate),
    "commission.prazoPagamento": String(PROGRAMA.prazoPagamentoDias),
    "contract.date": data.date,
    "contract.verifyCode": data.verifyCode,
  };
  return bodyHtml.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) =>
    key in fields ? fields[key] : match
  );
}

/** Dados fictícios para preview da minuta no admin. */
export function sampleMergeData(): MergeData {
  const partner = {
    id: "preview",
    status: "PENDING_CONTRACT",
    personType: "PJ",
    legalName: "Imobiliária Exemplo Ltda",
    document: "12345678000190",
    repName: "Maria da Silva",
    repDocument: "12345678909",
    email: "parceiro@exemplo.com.br",
    phone: "47999990000",
    archetype: "imobiliaria",
    city: "Blumenau",
    state: "SC",
    pixKey: null,
    bankInfo: null,
    commissionRate: PROGRAMA.comissaoPadrao,
    crmPartnerRef: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Partner;
  return {
    partner,
    rate: PROGRAMA.comissaoPadrao.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    date: formatDateExtenso(new Date()),
    verifyCode: "CRD-EXEM-PLO2",
  };
}
