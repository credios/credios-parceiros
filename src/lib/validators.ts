import { z } from "zod";
import { isValidDocument, onlyDigits } from "@/lib/format";
import { ARCHETYPES, PRODUCTS, PROGRAMA, UFS } from "@/lib/credios";
import {
  MIN_PROPERTY,
  MAX_PROPERTY,
  MIN_CREDIT,
  MIN_RENDA_TITULAR,
  MIN_RENDA_COM_CONJUGE,
  brl,
  isDisqualifiedType,
  liquidoInviavel,
  liquidoViavel,
  ltvOf,
  rendaQualifica,
  saldoDesqualifica,
} from "@/lib/qualificacao";

const documentSchema = z
  .string()
  .min(1, "Informe o CPF ou CNPJ.")
  .transform(onlyDigits)
  .refine(isValidDocument, "CPF ou CNPJ inválido — confira os dígitos.");

const phoneSchema = z
  .string()
  .min(1, "Informe o telefone.")
  .transform(onlyDigits)
  .refine((d) => d.length >= 10 && d.length <= 13, "Telefone inválido — use DDD + número.");

const moneySchema = z
  .union([z.string(), z.number()])
  .transform((v) => {
    if (typeof v === "number") return v;
    // aceita "500.000,00", "500000.00" e "500000"
    const normalized = v
      .replace(/[R$\s.]/g, "")
      .replace(",", ".");
    return Number(normalized);
  })
  .refine((n) => !Number.isNaN(n) && n > 0, "Informe um valor válido.");

/** Como moneySchema, mas aceita zero — saldo devedor 0 = imóvel quitado. */
const moneyOrZeroSchema = z
  .union([z.string(), z.number()])
  .transform((v) => {
    if (typeof v === "number") return v;
    const normalized = v.replace(/[R$\s.]/g, "").replace(",", ".");
    return Number(normalized);
  })
  .refine((n) => !Number.isNaN(n) && n >= 0, "Informe um valor válido.");

/**
 * Campo de dinheiro opcional: string vazia conta como ausente. A action já
 * normaliza "" → undefined, mas tratar aqui evita que um "" vindo de outro
 * caminho vire "Informe um valor válido" em vez da mensagem da regra.
 */
const optionalMoney = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  moneySchema.optional()
);
const optionalMoneyOrZero = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  moneyOrZeroSchema.optional()
);

export const loginSchema = z.object({
  email: z.string().email("Email inválido."),
  password: z.string().min(1, "Informe sua senha."),
});

export const passwordSchema = z
  .string()
  .min(10, "A senha precisa ter pelo menos 10 caracteres.");

export const acceptInviteSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptedTerms: z.literal(true, {
      message: "Você precisa aceitar os Termos de Uso e a Política de Privacidade.",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export const requestResetSchema = z.object({
  email: z.string().email("Email inválido."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

const archetypeValues = ARCHETYPES.map((a) => a.value) as [string, ...string[]];
const productValues = PRODUCTS.map((p) => p.value) as [string, ...string[]];
const ufValues = [...UFS] as [string, ...string[]];

export const partnerSchema = z.object({
  personType: z.enum(["PF", "PJ"]),
  legalName: z.string().min(3, "Informe o nome completo ou razão social."),
  document: documentSchema,
  repName: z.string().optional(),
  repDocument: z
    .string()
    .optional()
    .transform((v) => (v ? onlyDigits(v) : undefined))
    .refine((v) => !v || isValidDocument(v), "CPF do representante inválido."),
  email: z.string().email("Email inválido.").transform((e) => e.toLowerCase().trim()),
  phone: phoneSchema,
  archetype: z.enum(archetypeValues),
  managerId: z.string().min(1, "Selecione o gerente responsável pela carteira."),
  city: z.string().optional(),
  state: z.enum(ufValues).optional().or(z.literal("")).transform((v) => v || undefined),
  commissionRate: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return PROGRAMA.comissaoPadrao;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return n;
    })
    .refine((n) => !Number.isNaN(n) && n > 0 && n <= 10, "Taxa entre 0 e 10%."),
  notes: z.string().optional(),
});

const leadBaseSchema = z.object({
  name: z.string().min(3, "Informe o nome completo do cliente."),
  document: documentSchema,
  phone: phoneSchema,
  email: z
    .string()
    .email("Email inválido.")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  city: z.string().optional(),
  state: z.enum(ufValues).optional().or(z.literal("")).transform((v) => v || undefined),
  product: z.enum(productValues).default("CGI"),
  requestedAmount: optionalMoney,
  propertyValue: optionalMoney,
  propertyCity: z.string().optional(),
  propertyType: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  rendaTitular: optionalMoney,
  rendaConjuge: optionalMoneyOrZero,
  saldoDevedor: optionalMoneyOrZero,
  notes: z.string().max(2000).optional(),
  consent: z.literal(true, {
    message:
      "Confirme que você obteve autorização do cliente para compartilhar os dados.",
  }),
});

/**
 * Pré-qualificação de CGI — as mesmas regras do simulador do site
 * (src/lib/qualificacao.ts). Financiamento e condomínio seguem outra lógica
 * de garantia e não passam por aqui.
 *
 * superRefine em vez de refine encadeado para que o parceiro veja TODOS os
 * motivos de uma vez, cada um no seu campo, em vez de corrigir um por envio.
 */
export const leadSchema = leadBaseSchema.superRefine((d, ctx) => {
  if (d.product !== "CGI") return;

  const err = (path: string, message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

  // Campos que só são obrigatórios em CGI.
  if (d.propertyValue === undefined)
    err("propertyValue", "Informe o valor aproximado do imóvel.");
  if (d.requestedAmount === undefined)
    err("requestedAmount", "Informe o valor de crédito desejado.");
  if (!d.propertyType) err("propertyType", "Selecione o tipo do imóvel.");
  if (d.rendaTitular === undefined)
    err("rendaTitular", "Informe a renda mensal do titular.");
  if (d.saldoDevedor === undefined)
    err("saldoDevedor", "Informe o saldo devedor, ou marque que o imóvel está quitado.");

  // Tipo de imóvel fora da política (rural).
  if (d.propertyType && isDisqualifiedType(d.propertyType)) {
    err(
      "propertyType",
      "Imóvel rural está fora da política de crédito — não é possível indicar esta operação."
    );
    return;
  }

  // Piso e teto do imóvel.
  if (d.propertyValue !== undefined) {
    if (d.propertyValue < MIN_PROPERTY)
      err("propertyValue", `O imóvel precisa valer no mínimo ${brl(MIN_PROPERTY)}.`);
    if (d.propertyValue > MAX_PROPERTY)
      err("propertyValue", `Imóvel acima de ${brl(MAX_PROPERTY)} exige análise caso a caso — fale com seu gerente.`);
  }

  // Piso do crédito.
  if (d.requestedAmount !== undefined && d.requestedAmount < MIN_CREDIT)
    err("requestedAmount", `O crédito mínimo é de ${brl(MIN_CREDIT)}.`);

  // LTV conforme o tipo do imóvel.
  if (d.propertyValue !== undefined && d.requestedAmount !== undefined && d.propertyType) {
    const ltv = ltvOf(d.propertyType);
    const teto = Math.floor(d.propertyValue * ltv);
    if (d.requestedAmount > teto)
      err(
        "requestedAmount",
        `Para ${d.propertyType.toLowerCase()}, o crédito vai até ${Math.round(ltv * 100)}% do imóvel — no máximo ${brl(teto)}.`
      );
  }

  // Renda: titular sozinho, ou somada ao cônjuge.
  if (d.rendaTitular !== undefined && !rendaQualifica(d.rendaTitular, d.rendaConjuge))
    err(
      "rendaTitular",
      `Renda abaixo do mínimo: ${brl(MIN_RENDA_TITULAR)} do titular, ou ${brl(MIN_RENDA_COM_CONJUGE)} somando com o cônjuge.`
    );

  // Saldo devedor do financiamento em aberto.
  if (d.saldoDevedor !== undefined && d.saldoDevedor > 0 && d.propertyValue !== undefined) {
    if (saldoDesqualifica(d.saldoDevedor, d.propertyValue)) {
      err("saldoDevedor", "Saldo devedor igual ou acima de 50% do valor do imóvel — fora da política.");
    } else if (d.propertyType && liquidoInviavel(d.propertyValue, ltvOf(d.propertyType), d.saldoDevedor)) {
      const liquido = liquidoViavel(d.propertyValue, ltvOf(d.propertyType), d.saldoDevedor);
      err(
        "saldoDevedor",
        `Após quitar o financiamento sobrariam só ${brl(liquido)} líquidos, abaixo do mínimo de ${brl(MIN_CREDIT)}.`
      );
    }
  }
});

export const updateLeadStatusSchema = z
  .object({
    leadId: z.string().min(1),
    status: z.enum([
      "RECEBIDO",
      "EM_ANALISE",
      "DOCUMENTACAO",
      "AVALIACAO_IMOVEL",
      "EM_BANCO",
      "APROVADO",
      "CONTRATACAO",
      "LIBERADO",
      "RECUSADO",
      "CANCELADO",
      "EXCLUIDO",
    ]),
    note: z.string().max(1000).optional(),
    approvedAmount: moneySchema.optional(),
    disbursedAmount: moneySchema.optional(),
    disbursedAt: z.string().optional(), // yyyy-mm-dd
  })
  .refine((d) => d.status !== "LIBERADO" || d.disbursedAmount !== undefined, {
    message: "Para marcar como liberado, informe o valor efetivamente liberado.",
    path: ["disbursedAmount"],
  });

export const profileSchema = z.object({
  phone: phoneSchema,
  pixKey: z.string().max(140).optional().or(z.literal("")).transform((v) => v || undefined),
  bankName: z.string().max(100).optional(),
  bankAgency: z.string().max(20).optional(),
  bankAccount: z.string().max(30).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });
