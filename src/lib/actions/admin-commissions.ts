"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { sendCommissionPaidEmail } from "@/lib/email/templates";
import { formatBRL } from "@/lib/format";
import { type ActionState } from "@/lib/actions/admin-helpers";

const MAX_PROOF_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_PROOF_MIMES = ["application/pdf", "image/jpeg", "image/png"];

export async function markCommissionPaidAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireAdminSession();
  const commissionId = String(formData.get("commissionId") ?? "");
  if (!commissionId) return { ok: false, error: "Comissão não identificada." };

  const paidAtRaw = String(formData.get("paidAt") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAtRaw)) {
    return { ok: false, fieldErrors: { paidAt: "Informe a data do pagamento." } };
  }
  const paidAt = new Date(`${paidAtRaw}T12:00:00-03:00`);

  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      fieldErrors: { proof: "Anexe o comprovante de pagamento (PDF, JPG ou PNG)." },
    };
  }
  if (!ALLOWED_PROOF_MIMES.includes(file.type)) {
    return {
      ok: false,
      fieldErrors: { proof: "Formato não aceito — envie PDF, JPG ou PNG." },
    };
  }
  if (file.size > MAX_PROOF_SIZE) {
    return {
      ok: false,
      fieldErrors: { proof: "Arquivo acima de 5MB. Comprima e tente de novo." },
    };
  }

  const commission = await prisma.commission.findUnique({
    where: { id: commissionId },
    include: { partner: true, lead: { select: { name: true } } },
  });
  if (!commission) return { ok: false, error: "Comissão não encontrada." };
  if (commission.status !== "A_RECEBER") {
    return { ok: false, error: "Esta comissão não está mais na fila a receber." };
  }

  const proofBytes = new Uint8Array(await file.arrayBuffer());

  await prisma.commission.update({
    where: { id: commissionId },
    data: {
      status: "PAGA",
      paidAt,
      paymentProof: proofBytes,
      paymentProofMime: file.type,
    },
  });

  const partnerUser = await prisma.user.findFirst({
    where: { partnerId: commission.partnerId },
  });
  await sendCommissionPaidEmail({
    to: partnerUser?.email ?? commission.partner.email,
    partnerName: commission.partner.legalName,
    clientName: commission.lead.name,
    amount: commission.amount.toString(),
  });

  await logAdminAction({
    actorId: userId,
    action: "COMMISSION_PAID",
    entity: "Commission",
    entityId: commissionId,
    metadata: {
      amount: commission.amount.toString(),
      partnerId: commission.partnerId,
      paidAt: paidAtRaw,
    },
  });

  revalidatePath("/admin/comissoes");
  revalidatePath("/admin");
  return {
    ok: true,
    message: `Comissão de ${formatBRL(commission.amount)} marcada como paga.`,
  };
}

export async function cancelCommissionAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireAdminSession();
  const commissionId = String(formData.get("commissionId") ?? "");
  if (!commissionId) return { ok: false, error: "Comissão não identificada." };

  const confirmText = String(formData.get("confirmText") ?? "").trim().toUpperCase();
  if (confirmText !== "CANCELAR") {
    return {
      ok: false,
      fieldErrors: { confirmText: 'Digite "CANCELAR" para confirmar.' },
    };
  }

  const commission = await prisma.commission.findUnique({
    where: { id: commissionId },
  });
  if (!commission) return { ok: false, error: "Comissão não encontrada." };
  if (commission.status !== "A_RECEBER") {
    return { ok: false, error: "Só é possível cancelar comissões a receber." };
  }

  await prisma.commission.update({
    where: { id: commissionId },
    data: { status: "CANCELADA" },
  });

  await logAdminAction({
    actorId: userId,
    action: "COMMISSION_CANCELLED",
    entity: "Commission",
    entityId: commissionId,
    metadata: { amount: commission.amount.toString(), partnerId: commission.partnerId },
  });

  revalidatePath("/admin/comissoes");
  revalidatePath("/admin");
  return { ok: true, message: "Comissão cancelada." };
}
