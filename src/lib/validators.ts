import { z } from "zod";
import { isValidDocument, onlyDigits } from "@/lib/format";
import { ARCHETYPES, PRODUCTS, UFS } from "@/lib/credios";

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
  city: z.string().optional(),
  state: z.enum(ufValues).optional().or(z.literal("")).transform((v) => v || undefined),
  commissionRate: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return 1.5;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return n;
    })
    .refine((n) => !Number.isNaN(n) && n > 0 && n <= 10, "Taxa entre 0 e 10%."),
  notes: z.string().optional(),
});

export const leadSchema = z.object({
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
  requestedAmount: moneySchema.optional(),
  propertyValue: moneySchema.optional(),
  propertyCity: z.string().optional(),
  notes: z.string().max(2000).optional(),
  consent: z.literal(true, {
    message:
      "Confirme que você obteve autorização do cliente para compartilhar os dados.",
  }),
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
