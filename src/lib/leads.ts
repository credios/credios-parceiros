import { Prisma, type Lead, type LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STATUS_META, TERMINAL_STATUSES } from "@/lib/status";
import {
  sendAdminAlertEmail,
  sendCommissionCreatedEmail,
  sendStatusChangeEmail,
} from "@/lib/email/templates";
import { formatDocument } from "@/lib/format";

const REREGISTER_AFTER_DAYS = 90;

export type DuplicateCheck =
  | { type: "none" }
  | { type: "same_partner"; lead: Lead }
  | { type: "other_partner"; lead: Lead };

/**
 * Regra comercial de deduplicação: primeiro a cadastrar tem prioridade.
 * - Lead ativo (status não-terminal) ou LIBERADO com o mesmo CPF/CNPJ bloqueia.
 * - RECUSADO/CANCELADO há mais de 90 dias libera novo cadastro.
 */
export async function checkDuplicateLead(
  document: string,
  partnerId: string
): Promise<DuplicateCheck> {
  const cutoff = new Date(Date.now() - REREGISTER_AFTER_DAYS * 24 * 60 * 60_000);
  const existing = await prisma.lead.findFirst({
    where: {
      document,
      OR: [
        { status: { notIn: TERMINAL_STATUSES } },
        { status: "LIBERADO" },
        { status: { in: ["RECUSADO", "CANCELADO"] }, updatedAt: { gte: cutoff } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  if (!existing) return { type: "none" };
  return existing.partnerId === partnerId
    ? { type: "same_partner", lead: existing }
    : { type: "other_partner", lead: existing };
}

/** Notifica o admin sobre tentativa de indicação duplicada entre parceiros. */
export async function notifyDuplicateAttempt(opts: {
  attemptingPartnerName: string;
  existingLead: Lead;
  clientName: string;
}) {
  await sendAdminAlertEmail({
    subject: "Tentativa de indicação duplicada",
    bodyHtml: `<p>O parceiro <strong>${opts.attemptingPartnerName}</strong> tentou indicar <strong>${opts.clientName}</strong> (${formatDocument(opts.existingLead.document)}), mas já existe uma indicação ativa de outro parceiro (lead ${opts.existingLead.id}).</p>
      <p>Regra aplicada: primeiro a cadastrar tem prioridade. Override manual disponível no painel.</p>`,
    ctaPath: `/admin/leads/${opts.existingLead.id}`,
  });
}

interface StatusChangeExtras {
  note?: string;
  approvedAmount?: number;
  disbursedAmount?: number;
  disbursedAt?: Date;
}

/**
 * Transição de status — único caminho para mudar o status de um lead.
 * Atualiza o lead, registra LeadStatusEvent e, ao entrar em LIBERADO com o
 * valor líquido liberado ao cliente, cria a comissão com a taxa do parceiro
 * congelada (snapshot).
 * Dispara emails de marco ao parceiro. Idempotente: mesma transição repetida
 * não duplica evento nem comissão.
 */
export async function applyStatusChange(opts: {
  leadId: string;
  to: LeadStatus;
  source: "CRM_WEBHOOK" | "ADMIN" | "SYSTEM";
  actorId?: string;
  extras?: StatusChangeExtras;
}): Promise<{ lead: Lead; changed: boolean }> {
  const { leadId, to, source, actorId, extras } = opts;

  const result = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUniqueOrThrow({
      where: { id: leadId },
      include: { partner: true, commission: true },
    });

    const sameStatus = lead.status === to;
    const hasNewData =
      extras?.approvedAmount !== undefined || extras?.disbursedAmount !== undefined;
    if (sameStatus && !hasNewData) {
      return { lead, partner: lead.partner, changed: false, commission: null };
    }

    const data: Prisma.LeadUpdateInput = { status: to };
    if (extras?.approvedAmount !== undefined)
      data.approvedAmount = new Prisma.Decimal(extras.approvedAmount);
    if (extras?.disbursedAmount !== undefined)
      data.disbursedAmount = new Prisma.Decimal(extras.disbursedAmount);
    if (to === "LIBERADO")
      data.disbursedAt = extras?.disbursedAt ?? lead.disbursedAt ?? new Date();

    const updated = await tx.lead.update({ where: { id: leadId }, data });

    if (!sameStatus) {
      await tx.leadStatusEvent.create({
        data: {
          leadId,
          from: lead.status,
          to,
          source,
          actorId: actorId ?? null,
          note: extras?.note ?? null,
        },
      });
    }

    // Motor de comissão: LIBERADO + valor líquido liberado + ainda sem comissão
    let commission = null;
    const disbursed =
      extras?.disbursedAmount !== undefined
        ? new Prisma.Decimal(extras.disbursedAmount)
        : updated.disbursedAmount;
    if (to === "LIBERADO" && disbursed && !lead.commission) {
      const rate = lead.partner.commissionRate; // snapshot — nunca recalcular
      const amount = disbursed.mul(rate).div(100).toDecimalPlaces(2);
      commission = await tx.commission.create({
        data: {
          partnerId: lead.partnerId,
          leadId,
          baseAmount: disbursed,
          rate,
          amount,
          status: "A_RECEBER",
        },
      });
    }

    return { lead: updated, partner: lead.partner, changed: !sameStatus, commission };
  });

  // Emails fora da transação (não seguram o commit)
  if (result.changed && STATUS_META[to].notifyPartner) {
    const partnerUser = await prisma.user.findFirst({
      where: { partnerId: result.partner.id },
    });
    const to_ = partnerUser?.email ?? result.partner.email;
    if (to !== "LIBERADO") {
      await sendStatusChangeEmail({
        to: to_,
        partnerName: result.partner.legalName,
        clientName: result.lead.name,
        leadId: result.lead.id,
        status: to,
      });
    }
  }
  if (result.commission) {
    const partnerUser = await prisma.user.findFirst({
      where: { partnerId: result.partner.id },
    });
    await sendCommissionCreatedEmail({
      to: partnerUser?.email ?? result.partner.email,
      partnerName: result.partner.legalName,
      clientName: result.lead.name,
      amount: result.commission.amount.toString(),
      baseAmount: result.commission.baseAmount.toString(),
    });
  }

  return { lead: result.lead, changed: result.changed };
}
