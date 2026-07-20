/**
 * Política de PRÉ-QUALIFICAÇÃO de leads — mesma do simulador do site.
 *
 * ESPELHO de credios-website-v2/src/lib/qualificacao.ts. Os dois repositórios
 * são separados e não compartilham pacote, então a política vive duplicada.
 * Mudou no site? Mude AQUI também — indicação de parceiro e lead de simulador
 * têm que ser aceitos pelo mesmo critério, senão o parceiro manda o que o
 * site recusaria.
 *
 * Vale só para CGI. Financiamento imobiliário (o cliente ainda não tem o
 * imóvel, LTV chega a 80%) e crédito para condomínio seguem outra lógica e
 * não passam por estas regras.
 */

// ── Imóvel e crédito ─────────────────────────────────────────────────────
export const MIN_PROPERTY = 300_000;
export const MAX_PROPERTY = 20_000_000;
export const MIN_CREDIT = 75_000;

// ── Renda ────────────────────────────────────────────────────────────────
/** Renda mensal mínima do titular sozinho. */
export const MIN_RENDA_TITULAR = 5_000;
/** Se o titular fica abaixo do mínimo, a soma com o cônjuge precisa atingir este piso. */
export const MIN_RENDA_COM_CONJUGE = 8_000;

// ── Saldo devedor (imóvel financiado) ────────────────────────────────────
/** Saldo devedor ≥ esta fração do valor do imóvel → recusa. */
export const MAX_SALDO_RATIO = 0.5;

// ── LTV por tipo de imóvel ───────────────────────────────────────────────
// `disqualified` recusa a indicação (imóvel rural está fora da política).
export const PROPERTY_TYPES: {
  label: string;
  ltv: number;
  disqualified?: boolean;
}[] = [
  { label: "Apartamento", ltv: 0.6 },
  { label: "Casa de condomínio", ltv: 0.6 },
  { label: "Casa de rua", ltv: 0.5 },
  { label: "Sala comercial", ltv: 0.5 },
  { label: "Loja", ltv: 0.5 },
  { label: "Galpão", ltv: 0.5 },
  { label: "Terreno", ltv: 0.4 },
  { label: "Imóvel rural", ltv: 0, disqualified: true },
  { label: "Outro", ltv: 0.4 },
];

export const PROPERTY_TYPE_LABELS = PROPERTY_TYPES.map((t) => t.label);

/** Teto de LTV quando o tipo do imóvel ainda não é conhecido. */
export const DEFAULT_LTV = 0.6;

export function ltvOf(type: string): number {
  return PROPERTY_TYPES.find((t) => t.label === type)?.ltv ?? DEFAULT_LTV;
}

export function isDisqualifiedType(type: string): boolean {
  return PROPERTY_TYPES.find((t) => t.label === type)?.disqualified === true;
}

// ── Regras de recusa ─────────────────────────────────────────────────────

/**
 * Renda qualifica? Titular ≥ R$ 5 mil passa sozinho; abaixo disso, só passa
 * somando com o cônjuge/companheiro(a) que compõe renda e atingindo R$ 8 mil.
 */
export function rendaQualifica(
  rendaTitular: number,
  rendaConjuge?: number | null
): boolean {
  if (rendaTitular >= MIN_RENDA_TITULAR) return true;
  const conjuge = rendaConjuge ?? 0;
  return conjuge > 0 && rendaTitular + conjuge >= MIN_RENDA_COM_CONJUGE;
}

/** Saldo devedor igual ou superior a 50% do valor do imóvel → recusa. */
export function saldoDesqualifica(
  saldoDevedor: number,
  valorImovel: number
): boolean {
  return valorImovel > 0 && saldoDevedor >= valorImovel * MAX_SALDO_RATIO;
}

/**
 * Crédito líquido máximo que sobra para o cliente num imóvel financiado:
 * o banco quita o financiamento com parte do crédito, então o teto da
 * operação (LTV × imóvel) precisa comportar quitação + líquido.
 */
export function liquidoViavel(
  valorImovel: number,
  ltv: number,
  saldoDevedor: number
): number {
  return Math.max(0, Math.floor(valorImovel * ltv) - saldoDevedor);
}

/**
 * Mesmo com saldo < 50% do imóvel, a operação só é viável se o líquido que
 * sobra após a quitação atinge o crédito mínimo.
 */
export function liquidoInviavel(
  valorImovel: number,
  ltv: number,
  saldoDevedor: number
): boolean {
  return liquidoViavel(valorImovel, ltv, saldoDevedor) < MIN_CREDIT;
}

/** Formata um piso/valor em reais cheios para mensagem de erro. */
export function brl(v: number): string {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
