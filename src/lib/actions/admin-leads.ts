"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { applyStatusChange } from "@/lib/leads";
import { updateLeadStatusSchema } from "@/lib/validators";
import { formatBRL } from "@/lib/format";
import { syncLeadToCrm } from "@/lib/crm/sync";
import {
  toFieldErrors,
  optionalField,
  type ActionState,
} from "@/lib/actions/admin-helpers";

const BATCH_REPROCESS_LIMIT = 20;

/** "2026-06-11" → Date ao meio-dia em Brasília (evita virar o dia por fuso). */
function parseDateBR(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T12:00:00-03:00`);
}

export async function updateLeadStatusAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireAdminSession();

  const parsed = updateLeadStatusSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
    note: optionalField(formData, "note"),
    approvedAmount: optionalField(formData, "approvedAmount"),
    disbursedAmount: optionalField(formData, "disbursedAmount"),
    disbursedAt: optionalField(formData, "disbursedAt"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  const lead = await prisma.lead.findUnique({
    where: { id: data.leadId },
    select: { status: true },
  });
  if (!lead) return { ok: false, error: "Lead não encontrado." };

  const { changed } = await applyStatusChange({
    leadId: data.leadId,
    to: data.status,
    source: "ADMIN",
    actorId: userId,
    extras: {
      note: data.note,
      approvedAmount: data.approvedAmount,
      disbursedAmount: data.disbursedAmount,
      disbursedAt: data.disbursedAt ? parseDateBR(data.disbursedAt) : undefined,
    },
  });

  await logAdminAction({
    actorId: userId,
    action: "LEAD_STATUS_CHANGED",
    entity: "Lead",
    entityId: data.leadId,
    metadata: { from: lead.status, to: data.status, note: data.note ?? null },
  });

  revalidatePath(`/admin/leads/${data.leadId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  revalidatePath("/admin/comissoes");

  if (data.status === "LIBERADO") {
    const commission = await prisma.commission.findUnique({
      where: { leadId: data.leadId },
    });
    if (commission) {
      return {
        ok: true,
        message: `Status atualizado. Comissão de ${formatBRL(commission.amount)} gerada.`,
      };
    }
  }
  return {
    ok: true,
    message: changed ? "Status atualizado." : "O lead já estava neste status.",
  };
}

export async function reprocessLeadSyncAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireAdminSession();
  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return { ok: false, error: "Lead não identificado." };

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { crmSyncStatus: true },
  });
  if (!lead) return { ok: false, error: "Lead não encontrado." };

  try {
    await syncLeadToCrm(leadId);
  } catch {
    return {
      ok: false,
      error: "Falha ao reprocessar o sync. Veja o log em Integrações.",
    };
  }

  await logAdminAction({
    actorId: userId,
    action: "INTEGRATION_REPROCESSED",
    entity: "Lead",
    entityId: leadId,
  });

  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin/integracoes");
  return { ok: true, message: "Sync reprocessado." };
}

export async function reprocessAllSyncAction(): Promise<ActionState> {
  const { userId } = await requireAdminSession();

  const leads = await prisma.lead.findMany({
    where: { crmSyncStatus: { in: ["FAILED", "PENDING"] } },
    orderBy: { createdAt: "asc" },
    take: BATCH_REPROCESS_LIMIT,
    select: { id: true },
  });
  if (leads.length === 0) {
    return { ok: true, message: "Nenhum lead aguardando reprocessamento." };
  }

  let okCount = 0;
  let failCount = 0;
  for (const lead of leads) {
    try {
      await syncLeadToCrm(lead.id);
      okCount++;
    } catch {
      failCount++;
    }
  }

  await logAdminAction({
    actorId: userId,
    action: "INTEGRATION_REPROCESSED",
    entity: "IntegrationLog",
    entityId: "batch",
    metadata: { attempted: leads.length, ok: okCount, failed: failCount },
  });

  revalidatePath("/admin/integracoes");
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return {
    ok: failCount === 0,
    message: failCount === 0 ? `${okCount} lead(s) reprocessado(s) com sucesso.` : undefined,
    error:
      failCount > 0
        ? `${okCount} reprocessado(s), ${failCount} falhou(ram). Veja o log abaixo.`
        : undefined,
  };
}
