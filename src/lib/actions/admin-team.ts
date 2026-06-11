"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMasterSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { generateToken } from "@/lib/tokens";
import { sendManagerInviteEmail } from "@/lib/email/templates";
import { toFieldErrors, type ActionState } from "@/lib/actions/admin-helpers";

const INVITE_VALIDITY_DAYS = 7;

function inviteExpiry(): Date {
  return new Date(Date.now() + INVITE_VALIDITY_DAYS * 24 * 60 * 60_000);
}

const managerSchema = z.object({
  name: z.string().min(3, "Informe o nome completo do gerente."),
  email: z.string().email("Email inválido.").transform((e) => e.toLowerCase().trim()),
});

/** Cria um gerente (User ADMIN sem senha) e envia o convite por email. */
export async function createManagerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireMasterSession();

  const parsed = managerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  const emailExists = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (emailExists) {
    return {
      ok: false,
      fieldErrors: { email: "Já existe um usuário com este email no portal." },
    };
  }

  const { token, hash } = generateToken();

  const manager = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: "ADMIN",
      inviteToken: hash,
      inviteExpiry: inviteExpiry(),
    },
  });

  await sendManagerInviteEmail({ to: data.email, managerName: data.name, token });
  await logAdminAction({
    actorId: userId,
    action: "MANAGER_CREATED",
    entity: "User",
    entityId: manager.id,
    metadata: { name: data.name, email: data.email },
  });

  revalidatePath("/admin/equipe");
  redirect("/admin/equipe?convidado=1");
}

/** Reenvia o convite de um gerente pendente — o token anterior é invalidado. */
export async function resendManagerInviteAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireMasterSession();
  const managerId = String(formData.get("userId") ?? "");
  if (!managerId) return { ok: false, error: "Gerente não identificado." };

  const manager = await prisma.user.findFirst({
    where: { id: managerId, role: { in: ["ADMIN", "ADMIN_MASTER"] } },
    select: { id: true, name: true, email: true, passwordHash: true },
  });
  if (!manager) return { ok: false, error: "Gerente não encontrado." };
  if (manager.passwordHash) {
    return { ok: false, error: "Este gerente já criou a senha — o convite não se aplica mais." };
  }

  // Novo token invalida o anterior (campo único sobrescrito).
  const { token, hash } = generateToken();
  await prisma.user.update({
    where: { id: manager.id },
    data: { inviteToken: hash, inviteExpiry: inviteExpiry() },
  });
  await sendManagerInviteEmail({
    to: manager.email,
    managerName: manager.name,
    token,
  });
  await logAdminAction({
    actorId: userId,
    action: "MANAGER_INVITE_RESENT",
    entity: "User",
    entityId: manager.id,
  });

  revalidatePath("/admin/equipe");
  return { ok: true, message: `Convite reenviado para ${manager.email}.` };
}

/** Remove um gerente — apenas com a carteira vazia e nunca o configurador. */
export async function deleteManagerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireMasterSession();
  const managerId = String(formData.get("userId") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim().toUpperCase();
  if (!managerId) return { ok: false, error: "Gerente não identificado." };
  if (confirm !== "REMOVER") {
    return { ok: false, error: 'Digite "REMOVER" para confirmar a remoção.' };
  }

  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: { select: { managedPartners: true } },
    },
  });
  if (!manager || (manager.role !== "ADMIN" && manager.role !== "ADMIN_MASTER")) {
    return { ok: false, error: "Gerente não encontrado." };
  }
  if (manager.role === "ADMIN_MASTER") {
    return { ok: false, error: "O configurador não pode ser removido." };
  }
  if (manager._count.managedPartners > 0) {
    return {
      ok: false,
      error:
        "Este gerente ainda tem parceiros na carteira. Reatribua cada parceiro a outro gerente antes de removê-lo.",
    };
  }

  await prisma.user.delete({ where: { id: manager.id } });
  await logAdminAction({
    actorId: userId,
    action: "MANAGER_DELETED",
    entity: "User",
    entityId: manager.id,
    metadata: { name: manager.name, email: manager.email },
  });

  revalidatePath("/admin/equipe");
  return { ok: true, message: `Gerente ${manager.name} removido.` };
}

/** Move um parceiro para a carteira de outro gerente (só o configurador). */
export async function reassignPartnerManagerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireMasterSession();
  const partnerId = String(formData.get("partnerId") ?? "");
  const managerId = String(formData.get("managerId") ?? "");
  if (!partnerId) return { ok: false, error: "Parceiro não identificado." };
  if (!managerId) {
    return { ok: false, fieldErrors: { managerId: "Selecione o gerente responsável." } };
  }

  const [partner, manager] = await Promise.all([
    prisma.partner.findUnique({
      where: { id: partnerId },
      select: { id: true, managerId: true },
    }),
    prisma.user.findFirst({
      where: { id: managerId, role: { in: ["ADMIN", "ADMIN_MASTER"] } },
      select: { id: true, name: true },
    }),
  ]);
  if (!partner) return { ok: false, error: "Parceiro não encontrado." };
  if (!manager) {
    return { ok: false, fieldErrors: { managerId: "Gerente inválido." } };
  }
  if (partner.managerId === manager.id) {
    return { ok: true, message: "O parceiro já está na carteira deste gerente." };
  }

  await prisma.partner.update({
    where: { id: partnerId },
    data: { managerId: manager.id },
  });
  await logAdminAction({
    actorId: userId,
    action: "PARTNER_MANAGER_CHANGED",
    entity: "Partner",
    entityId: partnerId,
    metadata: { from: partner.managerId, to: manager.id },
  });

  revalidatePath(`/admin/parceiros/${partnerId}`);
  revalidatePath("/admin/parceiros");
  revalidatePath("/admin/equipe");
  return { ok: true, message: `Parceiro movido para a carteira de ${manager.name}.` };
}
