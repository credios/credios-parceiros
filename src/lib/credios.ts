/** Dados institucionais da Credios — fonte: site institucional (JSON-LD + footer). */
export const CREDIOS = {
  razaoSocial: "Credios Serviços Ltda",
  cnpj: "55.986.282/0001-30",
  endereco: "Rua Ingo Hering, 20, Sala 803, Centro, Blumenau/SC, CEP 89010-205",
  cidade: "Blumenau",
  uf: "SC",
  representanteLegal: "Gabriel Meirelles",
  email: "contato@credios.com.br",
  emailParcerias: "parceiros@credios.com.br",
  whatsapp: "(47) 2017-1026",
  whatsappUrl: "https://wa.me/554720171026",
  site: "https://credios.com.br",
  fundacao: 2019,
  regulacao: "Correspondente bancário autorizado pela Resolução BCB nº 4.935/2021",
} as const;

/** Condições padrão do programa de parcerias. */
export const PROGRAMA = {
  comissaoPadrao: 1.5, // % sobre o crédito liberado
  prazoPagamentoDias: 10, // dias úteis após a liberação (aprovado 11/06/2026)
  cicloTipicoDias: "30 a 90",
} as const;

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://parceiros.credios.com.br";

export const ARCHETYPES = [
  { value: "corretor", label: "Corretor de imóveis" },
  { value: "contador", label: "Contador" },
  { value: "advogado", label: "Advogado" },
  { value: "imobiliaria", label: "Imobiliária" },
  { value: "administradora", label: "Administradora de condomínios" },
  { value: "assessor", label: "Assessor de investimentos" },
  { value: "outro", label: "Outro" },
] as const;

export const PRODUCTS = [
  { value: "CGI", label: "Crédito com garantia de imóvel" },
  { value: "CONDOMINIO", label: "Crédito para condomínio" },
  { value: "FINANCIAMENTO", label: "Financiamento imobiliário" },
] as const;

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;
