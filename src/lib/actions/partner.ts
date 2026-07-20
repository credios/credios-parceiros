"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { requirePartnerSession, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { checkDuplicateLead, notifyDuplicateAttempt } from "@/lib/leads";
import { sendLeadReceivedEmail } from "@/lib/email/templates";
import { leadSchema, profileSchema, changePasswordSchema } from "@/lib/validators";
import { getOrCreateSignLink } from "@/lib/contracts/service";
import { syncLeadToCrm } from "@/lib/crm/sync";

/** Estado padrão de toda server action usada com useActionState. */
export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

/** Converte issues do Zod em { campo: primeira mensagem }. */
function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v : "";
}

/** "" → undefined (campos opcionais do formulário). */
function optional(v: FormDataEntryValue | null): string | undefined {
  const s = str(v).trim();
  return s || undefined;
}

/** Sair do portal. */
export async function signOutAction() {
  await signOut({ redirectTo: "/entrar" });
}

/**
 * Leva o parceiro ao fluxo de assinatura do contrato
 * (usada no gating do layout e na página /app/contrato).
 */
export async function signContractAction() {
  const { partnerId } = await requirePartnerSession();
  const path = await getOrCreateSignLink(partnerId);
  redirect(path);
}

/** Cria a indicação de cliente — o fluxo mais importante do portal. */
export async function createLeadAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { partnerId } = await requirePartnerSession();

  const parsed = leadSchema.safeParse({
    name: str(formData.get("name")).trim(),
    document: str(formData.get("document")),
    phone: str(formData.get("phone")),
    email: str(formData.get("email")).trim(),
    city: optional(formData.get("city")),
    state: str(formData.get("state")),
    product: str(formData.get("product")) || "CGI",
    requestedAmount: optional(formData.get("requestedAmount")),
    propertyValue: optional(formData.get("propertyValue")),
    propertyCity: optional(formData.get("propertyCity")),
    propertyType: optional(formData.get("propertyType")),
    rendaTitular: optional(formData.get("rendaTitular")),
    rendaConjuge: optional(formData.get("rendaConjuge")),
    saldoDevedor: optional(formData.get("saldoDevedor")),
    notes: optional(formData.get("notes")),
    consent: formData.get("consent") === "on",
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  const duplicate = await checkDuplicateLead(data.document, partnerId);

  if (duplicate.type === "other_partner") {
    const partner = await prisma.partner.findUniqueOrThrow({
      where: { id: partnerId },
      select: { legalName: true },
    });
    const existingLead = duplicate.lead;
    after(async () => {
      try {
        await notifyDuplicateAttempt({
          attemptingPartnerName: partner.legalName,
          existingLead,
          clientName: data.name,
        });
      } catch {
        // alerta interno não pode quebrar a resposta ao parceiro
      }
    });
    // Mensagem neutra de propósito: não revela quem indicou nem quando.
    return { ok: false, error: "Este cliente já possui uma indicação ativa na Credios." };
  }

  if (duplicate.type === "same_partner") {
    redirect(`/app/clientes/${duplicate.lead.id}?ja=1`);
  }

  const lead = await prisma.lead.create({
    data: {
      partnerId,
      name: data.name,
      document: data.document,
      phone: data.phone,
      email: data.email ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      product: data.product,
      requestedAmount:
        data.requestedAmount !== undefined ? new Prisma.Decimal(data.requestedAmount) : null,
      propertyValue:
        data.propertyValue !== undefined ? new Prisma.Decimal(data.propertyValue) : null,
      propertyCity: data.propertyCity ?? null,
      propertyType: data.propertyType ?? null,
      rendaTitular:
        data.rendaTitular !== undefined ? new Prisma.Decimal(data.rendaTitular) : null,
      rendaConjuge:
        data.rendaConjuge !== undefined ? new Prisma.Decimal(data.rendaConjuge) : null,
      saldoDevedor:
        data.saldoDevedor !== undefined ? new Prisma.Decimal(data.saldoDevedor) : null,
      notes: data.notes ?? null,
      consentAt: new Date(),
      status: "RECEBIDO",
      crmSyncStatus: "PENDING",
      statusHistory: {
        create: {
          to: "RECEBIDO",
          source: "SYSTEM",
          note: "Indicação cadastrada pelo parceiro no portal",
        },
      },
    },
  });

  const [partner, partnerUser] = await Promise.all([
    prisma.partner.findUniqueOrThrow({
      where: { id: partnerId },
      select: { legalName: true, email: true },
    }),
    prisma.user.findFirst({ where: { partnerId }, select: { email: true } }),
  ]);

  after(async () => {
    try {
      await sendLeadReceivedEmail({
        to: partnerUser?.email ?? partner.email,
        partnerName: partner.legalName,
        clientName: lead.name,
        leadId: lead.id,
      });
    } catch {
      // email de confirmação é cortesia — não pode quebrar o fluxo
    }
    await syncLeadToCrm(lead.id);
  });

  revalidatePath("/app");
  revalidatePath("/app/clientes");
  redirect(`/app/clientes/${lead.id}?nova=1`);
}

const MAX_INVOICE_BYTES = 5 * 1024 * 1024; // 5MB

/** Anexa a nota fiscal (PDF) de uma comissão — parceiro PJ. */
export async function uploadInvoiceAction(
  commissionId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { partnerId } = await requirePartnerSession();

  // Ownership: a comissão precisa pertencer ao parceiro da sessão.
  const commission = await prisma.commission.findFirst({
    where: { id: commissionId, partnerId },
    select: { id: true },
  });
  if (!commission) {
    return { ok: false, error: "Comissão não encontrada." };
  }

  const file = formData.get("invoice");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione o PDF da nota fiscal." };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, error: "A nota fiscal precisa ser um arquivo PDF." };
  }
  if (file.size > MAX_INVOICE_BYTES) {
    return { ok: false, error: "O PDF pode ter no máximo 5MB." };
  }

  await prisma.commission.update({
    where: { id: commission.id },
    data: {
      invoice: Buffer.from(await file.arrayBuffer()),
      invoiceMime: file.type,
      invoiceName: file.name,
    },
  });

  revalidatePath("/app/comissoes");
  return { ok: true };
}

/** Atualiza telefone e dados de recebimento do parceiro. */
export async function updateProfileAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { partnerId } = await requirePartnerSession();

  const parsed = profileSchema.safeParse({
    phone: str(formData.get("phone")),
    pixKey: str(formData.get("pixKey")).trim(),
    bankName: optional(formData.get("bankName")),
    bankAgency: optional(formData.get("bankAgency")),
    bankAccount: optional(formData.get("bankAccount")),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  const hasBankInfo = Boolean(data.bankName || data.bankAgency || data.bankAccount);

  await prisma.partner.update({
    where: { id: partnerId },
    data: {
      phone: data.phone,
      pixKey: data.pixKey ?? null,
      bankInfo: hasBankInfo
        ? {
            bankName: data.bankName ?? "",
            bankAgency: data.bankAgency ?? "",
            bankAccount: data.bankAccount ?? "",
          }
        : Prisma.JsonNull,
    },
  });

  revalidatePath("/app/perfil");
  return { ok: true };
}

/** Troca a senha do parceiro (exige a senha atual). */
export async function changePasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requirePartnerSession();

  const allowed = await rateLimit(`pwchange:${userId}`, { max: 5, windowMinutes: 15 });
  if (!allowed) {
    return { ok: false, error: "Muitas tentativas. Aguarde 15 minutos." };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: str(formData.get("currentPassword")),
    password: str(formData.get("password")),
    confirmPassword: str(formData.get("confirmPassword")),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid =
    !!user.passwordHash &&
    (await bcrypt.compare(parsed.data.currentPassword, user.passwordHash));
  if (!valid) {
    return { ok: false, fieldErrors: { currentPassword: "Senha atual incorreta." } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return { ok: true };
}
