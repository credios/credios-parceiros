"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { resendContract } from "@/lib/contracts/service";
import { toFieldErrors, type ActionState } from "@/lib/actions/admin-helpers";

const templateSchema = z.object({
  name: z.string().min(3, "Dê um nome à versão (ex.: Revisão jurídica jun/2026)."),
  bodyHtml: z.string().min(50, "O corpo do contrato parece vazio."),
});

export async function createTemplateAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireAdminSession();

  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    bodyHtml: formData.get("bodyHtml"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const template = await prisma.$transaction(async (tx) => {
    const max = await tx.contractTemplate.aggregate({ _max: { version: true } });
    const version = (max._max.version ?? 0) + 1;
    await tx.contractTemplate.updateMany({
      where: { active: true },
      data: { active: false },
    });
    return tx.contractTemplate.create({
      data: {
        version,
        name: parsed.data.name,
        bodyHtml: parsed.data.bodyHtml,
        active: true,
      },
    });
  });

  await logAdminAction({
    actorId: userId,
    action: "TEMPLATE_UPDATED",
    entity: "ContractTemplate",
    entityId: template.id,
    metadata: { version: template.version, name: template.name },
  });

  revalidatePath("/admin/contratos");
  redirect("/admin/contratos");
}

export async function resendContractAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireAdminSession();
  const contractId = String(formData.get("contractId") ?? "");
  if (!contractId) return { ok: false, error: "Contrato não identificado." };

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { partner: { select: { legalName: true } } },
  });
  if (!contract) return { ok: false, error: "Contrato não encontrado." };
  if (contract.status === "SIGNED" || contract.status === "CANCELLED") {
    return { ok: false, error: "Este contrato não pode mais ser reenviado." };
  }

  try {
    await resendContract(contractId);
  } catch {
    return { ok: false, error: "Não foi possível reenviar o contrato agora." };
  }

  await logAdminAction({
    actorId: userId,
    action: "CONTRACT_RESENT",
    entity: "Contract",
    entityId: contractId,
  });

  revalidatePath("/admin/contratos");
  return {
    ok: true,
    message: `Link de assinatura reenviado para ${contract.partner.legalName}.`,
  };
}
