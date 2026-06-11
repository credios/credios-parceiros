import { cn } from "@/lib/cn";
import type { LeadStatus, CommissionStatus, PartnerStatus, ContractStatus } from "@prisma/client";
import { STATUS_META, TONE_BADGE_CLASSES, type StatusTone } from "@/lib/status";
import type { ReactNode } from "react";

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: StatusTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
        TONE_BADGE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const meta = STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const commissionMeta: Record<CommissionStatus, { label: string; tone: StatusTone }> = {
  PREVISTA: { label: "Prevista", tone: "neutral" },
  A_RECEBER: { label: "A receber", tone: "gold" },
  PAGA: { label: "Paga", tone: "success" },
  CANCELADA: { label: "Cancelada", tone: "neutral" },
};

export function CommissionStatusBadge({ status }: { status: CommissionStatus }) {
  const meta = commissionMeta[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const partnerMeta: Record<PartnerStatus, { label: string; tone: StatusTone }> = {
  INVITED: { label: "Convidado", tone: "info" },
  PENDING_CONTRACT: { label: "Contrato pendente", tone: "warning" },
  ACTIVE: { label: "Ativo", tone: "success" },
  SUSPENDED: { label: "Suspenso", tone: "danger" },
  INACTIVE: { label: "Inativo", tone: "neutral" },
};

export function PartnerStatusBadge({ status }: { status: PartnerStatus }) {
  const meta = partnerMeta[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const contractMeta: Record<ContractStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: "Rascunho", tone: "neutral" },
  SENT: { label: "Enviado", tone: "info" },
  VIEWED: { label: "Visualizado", tone: "warning" },
  SIGNED: { label: "Assinado", tone: "success" },
  CANCELLED: { label: "Cancelado", tone: "neutral" },
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const meta = contractMeta[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
