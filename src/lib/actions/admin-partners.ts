"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireAdminSession, requireMasterSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { generateToken } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/email/templates";
import { addPartnerToAudience, removePartnerFromAudience } from "@/lib/email/audience";
import { partnerSchema } from "@/lib/validators";
import {
  toFieldErrors,
  optionalField,
  type ActionState,
} from "@/lib/actions/admin-helpers";

const INVITE_VALIDITY_DAYS = 7;

function inviteExpiry(): Date {
  return new Date(Date.now() + INVITE_VALIDITY_DAYS * 24 * 60 * 60_000);
}

export async function createPartnerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId, isMaster } = await requireAdminSession();

  const parsed = partnerSchema.safeParse({
    personType: formData.get("personType"),
    legalName: formData.get("legalName"),
    document: formData.get("document"),
    repName: optionalField(formData, "repName"),
    repDocument: optionalField(formData, "repDocument"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    archetype: formData.get("archetype"),
    // Gerente nunca escolhe: o parceiro nasce na própria carteira,
    // ignorando qualquer managerId vindo do client (segurança).
    managerId: isMaster ? formData.get("managerId") : userId,
    city: optionalField(formData, "city"),
    state: formData.get("state") ?? "",
    commissionRate: optionalField(formData, "commissionRate") ?? "",
    notes: optionalField(formData, "notes"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  const manager = await prisma.user.findFirst({
    where: { id: data.managerId, role: { in: ["ADMIN", "ADMIN_MASTER"] } },
    select: { id: true },
  });
  if (!manager) {
    return {
      ok: false,
      fieldErrors: { managerId: "Selecione um gerente válido para a carteira." },
    };
  }

  if (data.personType === "PJ" && (!data.repName || !data.repDocument)) {
    return {
      ok: false,
      fieldErrors: {
        [data.repName ? "repDocument" : "repName"]:
          "Para PJ, informe o representante legal e o CPF dele.",
      },
    };
  }

  const [docExists, emailExists] = await Promise.all([
    prisma.partner.findUnique({ where: { document: data.document } }),
    prisma.user.findUnique({ where: { email: data.email } }),
  ]);
  if (docExists) {
    return {
      ok: false,
      fieldErrors: { document: "Já existe um parceiro cadastrado com este CPF/CNPJ." },
    };
  }
  if (emailExists) {
    return {
      ok: false,
      fieldErrors: { email: "Já existe um usuário com este email no portal." },
    };
  }

  const { token, hash } = generateToken();

  const partner = await prisma.$transaction(async (tx) => {
    const p = await tx.partner.create({
      data: {
        status: "INVITED",
        personType: data.personType,
        legalName: data.legalName,
        document: data.document,
        repName: data.repName ?? null,
        repDocument: data.repDocument ?? null,
        email: data.email,
        phone: data.phone,
        archetype: data.archetype,
        city: data.city ?? null,
        state: data.state ?? null,
        commissionRate: new Prisma.Decimal(data.commissionRate.toFixed(2)),
        notes: data.notes ?? null,
        managerId: data.managerId,
      },
    });
    await tx.user.create({
      data: {
        email: data.email,
        name: data.legalName,
        role: "PARTNER",
        partnerId: p.id,
        inviteToken: hash,
        inviteExpiry: inviteExpiry(),
      },
    });
    return p;
  });

  await sendInviteEmail({ to: data.email, partnerName: data.legalName, token });
  // Parceiro entra na lista de newsletter do Resend fora do caminho crítico.
  after(() => addPartnerToAudience({ name: data.legalName, email: data.email }));
  await logAdminAction({
    actorId: userId,
    action: "PARTNER_CREATED",
    entity: "Partner",
    entityId: partner.id,
    metadata: { managerId: data.managerId },
  });

  revalidatePath("/admin/parceiros");
  redirect(`/admin/parceiros/${partner.id}?convidado=1`);
}

export async function resendInviteAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId, partnerScope } = await requireAdminSession();
  const partnerId = String(formData.get("partnerId") ?? "");
  if (!partnerId) return { ok: false, error: "Parceiro não identificado." };

  const user = await prisma.user.findFirst({
    where: { partnerId, partner: partnerScope },
    include: { partner: true },
  });
  if (!user?.partner) {
    return { ok: false, error: "Usuário do parceiro não encontrado." };
  }
  if (user.partner.status !== "INVITED") {
    return { ok: false, error: "Este parceiro já criou a senha — o convite não se aplica mais." };
  }

  // Novo token invalida o anterior (campo único sobrescrito).
  const { token, hash } = generateToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { inviteToken: hash, inviteExpiry: inviteExpiry() },
  });
  await sendInviteEmail({
    to: user.email,
    partnerName: user.partner.legalName,
    token,
  });
  await logAdminAction({
    actorId: userId,
    action: "INVITE_RESENT",
    entity: "Partner",
    entityId: partnerId,
  });

  revalidatePath(`/admin/parceiros/${partnerId}`);
  return { ok: true, message: `Convite reenviado para ${user.email}.` };
}

export async function suspendPartnerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireMasterSession();
  const partnerId = String(formData.get("partnerId") ?? "");
  if (!partnerId) return { ok: false, error: "Parceiro não identificado." };

  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) return { ok: false, error: "Parceiro não encontrado." };
  if (partner.status === "SUSPENDED") {
    return { ok: false, error: "Este parceiro já está suspenso." };
  }

  await prisma.partner.update({
    where: { id: partnerId },
    data: { status: "SUSPENDED" },
  });
  await logAdminAction({
    actorId: userId,
    action: "PARTNER_SUSPENDED",
    entity: "Partner",
    entityId: partnerId,
    metadata: { from: partner.status },
  });

  revalidatePath(`/admin/parceiros/${partnerId}`);
  revalidatePath("/admin/parceiros");
  return { ok: true, message: "Parceiro suspenso. O acesso ao portal foi bloqueado." };
}

export async function reactivatePartnerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireMasterSession();
  const partnerId = String(formData.get("partnerId") ?? "");
  if (!partnerId) return { ok: false, error: "Parceiro não identificado." };

  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) return { ok: false, error: "Parceiro não encontrado." };
  if (partner.status !== "SUSPENDED" && partner.status !== "INACTIVE") {
    return { ok: false, error: "Este parceiro não está suspenso." };
  }

  await prisma.partner.update({
    where: { id: partnerId },
    data: { status: "ACTIVE" },
  });
  await logAdminAction({
    actorId: userId,
    action: "PARTNER_REACTIVATED",
    entity: "Partner",
    entityId: partnerId,
    metadata: { from: partner.status },
  });

  revalidatePath(`/admin/parceiros/${partnerId}`);
  revalidatePath("/admin/parceiros");
  return { ok: true, message: "Parceiro reativado. O acesso ao portal foi restabelecido." };
}

export async function updatePartnerRateAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireMasterSession();
  const partnerId = String(formData.get("partnerId") ?? "");
  if (!partnerId) return { ok: false, error: "Parceiro não identificado." };

  const raw = String(formData.get("commissionRate") ?? "").trim();
  const rate = Number(raw.replace(",", "."));
  if (Number.isNaN(rate) || rate <= 0 || rate > 10) {
    return {
      ok: false,
      fieldErrors: { commissionRate: "Informe uma taxa entre 0 e 10% (ex.: 3,00)." },
    };
  }

  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) return { ok: false, error: "Parceiro não encontrado." };

  await prisma.partner.update({
    where: { id: partnerId },
    data: { commissionRate: new Prisma.Decimal(rate.toFixed(2)) },
  });
  await logAdminAction({
    actorId: userId,
    action: "PARTNER_RATE_CHANGED",
    entity: "Partner",
    entityId: partnerId,
    metadata: { from: partner.commissionRate.toString(), to: rate.toFixed(2) },
  });

  revalidatePath(`/admin/parceiros/${partnerId}`);
  return {
    ok: true,
    message: "Taxa atualizada. Comissões já geradas não são recalculadas.",
  };
}

const updatePartnerDataSchema = partnerSchema
  .pick({ legalName: true, document: true, email: true, phone: true })
  .extend({ notes: z.string().max(2000).optional() });

export async function updatePartnerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId, partnerScope } = await requireAdminSession();
  const partnerId = String(formData.get("partnerId") ?? "");
  if (!partnerId) return { ok: false, error: "Parceiro não identificado." };

  const parsed = updatePartnerDataSchema.safeParse({
    legalName: formData.get("legalName"),
    document: formData.get("document"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: optionalField(formData, "notes"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  const partner = await prisma.partner.findFirst({
    where: { id: partnerId, ...partnerScope },
  });
  if (!partner) return { ok: false, error: "Parceiro não encontrado." };

  const [docConflict, emailConflict] = await Promise.all([
    prisma.partner.findFirst({
      where: { document: data.document, id: { not: partnerId } },
    }),
    prisma.user.findFirst({
      where: { email: data.email, partnerId: { not: partnerId } },
    }),
  ]);
  if (docConflict) {
    return {
      ok: false,
      fieldErrors: { document: "Outro parceiro já usa este CPF/CNPJ." },
    };
  }
  if (emailConflict) {
    return {
      ok: false,
      fieldErrors: { email: "Outro usuário do portal já usa este email." },
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.partner.update({
      where: { id: partnerId },
      data: {
        legalName: data.legalName,
        document: data.document,
        email: data.email,
        phone: data.phone,
        notes: data.notes ?? null,
      },
    });
    // Mantém o login do parceiro em sincronia com o cadastro.
    await tx.user.updateMany({
      where: { partnerId },
      data: { email: data.email, name: data.legalName },
    });
  });

  await logAdminAction({
    actorId: userId,
    action: "PARTNER_UPDATED",
    entity: "Partner",
    entityId: partnerId,
  });

  revalidatePath(`/admin/parceiros/${partnerId}`);
  revalidatePath("/admin/parceiros");
  return { ok: true, message: "Dados cadastrais atualizados." };
}

/**
 * Exclusão DEFINITIVA de um parceiro (master). Para cadastros errados/testes:
 * libera o email para reuso (ex.: recadastrar a pessoa como gerente).
 * - Bloqueada se houver QUALQUER comissão (trilha financeira intocável).
 * - Apaga em transação: leads (histórico em cascade), contratos (auditoria
 *   em cascade), o usuário de acesso e o parceiro. Remove da audience.
 */
export async function deletePartnerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireMasterSession();
  const partnerId = String(formData.get("partnerId") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim().toUpperCase();
  if (!partnerId) return { ok: false, error: "Parceiro não identificado." };
  if (confirm !== "EXCLUIR") {
    return { ok: false, error: 'Digite "EXCLUIR" para confirmar a exclusão.' };
  }

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: {
      id: true,
      legalName: true,
      document: true,
      email: true,
      status: true,
      _count: { select: { commissions: true, leads: true, contracts: true } },
    },
  });
  if (!partner) return { ok: false, error: "Parceiro não encontrado." };
  if (partner._count.commissions > 0) {
    return {
      ok: false,
      error:
        "Este parceiro tem comissões registradas e não pode ser excluído — a trilha financeira precisa ser preservada. Use a suspensão para bloquear o acesso.",
    };
  }

  await prisma.$transaction([
    prisma.lead.deleteMany({ where: { partnerId } }), // histórico em cascade
    prisma.contract.deleteMany({ where: { partnerId } }), // auditoria em cascade
    prisma.user.deleteMany({ where: { partnerId } }),
    prisma.partner.delete({ where: { id: partnerId } }),
  ]);

  await logAdminAction({
    actorId: userId,
    action: "PARTNER_DELETED",
    entity: "Partner",
    entityId: partnerId,
    metadata: {
      legalName: partner.legalName,
      document: partner.document,
      email: partner.email,
      status: partner.status,
      leadsApagados: partner._count.leads,
      contratosApagados: partner._count.contracts,
    },
  });

  after(() => removePartnerFromAudience(partner.email));

  revalidatePath("/admin/parceiros");
  revalidatePath("/admin");
  redirect("/admin/parceiros?excluido=1");
}
