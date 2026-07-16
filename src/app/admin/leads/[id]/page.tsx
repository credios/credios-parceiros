import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PRODUCTS } from "@/lib/credios";
import { STATUS_META } from "@/lib/status";
import {
  formatBRL,
  formatDate,
  formatDateTime,
  formatDocument,
  formatPhone,
} from "@/lib/format";
import { Card } from "@/components/ui/card";
import { LeadStatusBadge, CommissionStatusBadge, Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ReprocessSyncButton } from "../../_components/sync-buttons";
import { LeadStatusForm } from "./lead-status-form";
import { DeleteLeadForm } from "./delete-lead-form";

export const metadata: Metadata = { title: "Lead" };

const SOURCE_LABEL: Record<string, string> = {
  CRM_WEBHOOK: "CRM (webhook)",
  ADMIN: "Admin",
  SYSTEM: "Sistema",
};

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { isMaster, partnerScope } = await requireAdminSession();
  const { id } = await params;

  // Escopo de carteira: gerente só abre leads de parceiros que são dele.
  const lead = await prisma.lead.findFirst({
    where: { id, partner: partnerScope },
    include: {
      partner: { select: { id: true, legalName: true } },
      commission: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!lead) notFound();

  const actorIds = [
    ...new Set(lead.statusHistory.map((e) => e.actorId).filter((v): v is string => !!v)),
  ];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true },
      })
    : [];
  const actorName = new Map(actors.map((a) => [a.id, a.name]));

  const productLabel =
    PRODUCTS.find((p) => p.value === lead.product)?.label ?? lead.product;

  return (
    <div>
      <PageHeader
        title={lead.name}
        description={`Indicado por ${lead.partner.legalName} em ${formatDate(lead.createdAt)}`}
        action={<LeadStatusBadge status={lead.status} />}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card>
            <h2 className="t-heading text-credios-charcoal">Cliente</h2>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="t-eyebrow text-neutral-400">CPF/CNPJ</dt>
                <dd className="mt-1 font-medium">{formatDocument(lead.document)}</dd>
              </div>
              <div>
                <dt className="t-eyebrow text-neutral-400">Telefone</dt>
                <dd className="mt-1 font-medium">{formatPhone(lead.phone)}</dd>
              </div>
              <div>
                <dt className="t-eyebrow text-neutral-400">Email</dt>
                <dd className="mt-1 font-medium break-all">{lead.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="t-eyebrow text-neutral-400">Localização</dt>
                <dd className="mt-1 font-medium">
                  {lead.city ? `${lead.city}${lead.state ? `/${lead.state}` : ""}` : "—"}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex items-start gap-2 rounded-md bg-status-info-bg px-3 py-2.5">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-status-info" aria-hidden />
              <p className="t-caption text-status-info">
                Consentimento LGPD declarado pelo parceiro em {formatDateTime(lead.consentAt)}.
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="t-heading text-credios-charcoal">Operação</h2>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="t-eyebrow text-neutral-400">Produto</dt>
                <dd className="mt-1 font-medium">{productLabel}</dd>
              </div>
              <div>
                <dt className="t-eyebrow text-neutral-400">Valor desejado</dt>
                <dd className="t-money mt-1">{formatBRL(lead.requestedAmount)}</dd>
              </div>
              <div>
                <dt className="t-eyebrow text-neutral-400">Valor do imóvel</dt>
                <dd className="t-money mt-1">{formatBRL(lead.propertyValue)}</dd>
              </div>
              <div>
                <dt className="t-eyebrow text-neutral-400">Cidade do imóvel</dt>
                <dd className="mt-1 font-medium">{lead.propertyCity ?? "—"}</dd>
              </div>
              <div>
                <dt className="t-eyebrow text-neutral-400">Valor aprovado</dt>
                <dd className="t-money mt-1">{formatBRL(lead.approvedAmount)}</dd>
              </div>
              <div>
                <dt className="t-eyebrow text-neutral-400">Valor líquido liberado</dt>
                <dd className="t-money mt-1">
                  {formatBRL(lead.disbursedAmount)}
                  {lead.disbursedAt && (
                    <span className="t-caption ml-1.5 font-normal text-neutral-500">
                      em {formatDate(lead.disbursedAt)}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
            {lead.notes && (
              <div className="mt-4 border-t border-neutral-100 pt-4">
                <p className="t-caption text-neutral-500">Contexto do parceiro</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">
                  {lead.notes}
                </p>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="t-heading text-credios-charcoal">Histórico de status</h2>
            {lead.statusHistory.length === 0 ? (
              <p className="t-body mt-4 text-neutral-500">Nenhum evento registrado.</p>
            ) : (
              <ol className="mt-5 flex flex-col">
                {lead.statusHistory.map((event, index) => (
                  <li key={event.id} className="relative flex gap-4 pb-5 last:pb-0">
                    <span
                      className="relative flex w-2.5 shrink-0 justify-center"
                      aria-hidden
                    >
                      <span
                        className={
                          index === 0
                            ? "mt-1 size-2.5 rounded-full bg-credios-blue"
                            : "mt-1 size-2.5 rounded-full bg-neutral-200"
                        }
                      />
                      {index < lead.statusHistory.length - 1 && (
                        <span className="absolute inset-x-0 top-5 bottom-0 mx-auto w-px bg-neutral-200" />
                      )}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {event.from && (
                          <>
                            <span className="t-caption text-neutral-500">
                              {STATUS_META[event.from].label}
                            </span>
                            <ArrowRight
                              size={12}
                              className="text-neutral-400"
                              aria-hidden
                            />
                          </>
                        )}
                        <span className="text-sm font-medium text-credios-charcoal">
                          {STATUS_META[event.to].label}
                        </span>
                        <Badge tone="neutral">
                          {SOURCE_LABEL[event.source] ?? event.source}
                        </Badge>
                      </div>
                      <p className="t-caption text-neutral-400">
                        {formatDateTime(event.createdAt)}
                        {event.actorId &&
                          ` — por ${actorName.get(event.actorId) ?? "usuário removido"}`}
                      </p>
                      {event.note && (
                        <p className="text-sm text-neutral-600">{event.note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="t-heading text-credios-charcoal">Mudar status</h2>
            <p className="t-caption mt-1 text-neutral-500">
              Modo manual — use quando o CRM não estiver conectado.
            </p>
            <div className="mt-4">
              <LeadStatusForm leadId={lead.id} currentStatus={lead.status} />
            </div>
          </Card>

          {lead.commission && (
            <Card tone="ivory">
              <h2 className="t-heading text-credios-charcoal">Comissão</h2>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="t-money text-2xl text-credios-charcoal">
                  {formatBRL(lead.commission.amount)}
                </p>
                <CommissionStatusBadge status={lead.commission.status} />
              </div>
              <p className="t-caption mt-1 text-neutral-500">
                {formatBRL(lead.commission.baseAmount)} ×{" "}
                {Number(lead.commission.rate).toFixed(2).replace(".", ",")}%
              </p>
              <Link
                href="/admin/comissoes"
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-credios-blue transition-colors duration-150 hover:text-credios-blue-700"
              >
                Ver na fila de comissões
                <ArrowRight size={15} aria-hidden />
              </Link>
            </Card>
          )}

          <Card>
            <h2 className="t-heading text-credios-charcoal">Parceiro</h2>
            <Link
              href={`/admin/parceiros/${lead.partner.id}`}
              className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-credios-blue transition-colors duration-150 hover:text-credios-blue-700"
            >
              {lead.partner.legalName}
            </Link>
          </Card>

          <Card>
            <h2 className="t-heading text-credios-charcoal">Sync CRM</h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-neutral-500">Status</dt>
                <dd>
                  <Badge
                    tone={
                      lead.crmSyncStatus === "SYNCED"
                        ? "success"
                        : lead.crmSyncStatus === "FAILED"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {lead.crmSyncStatus === "SYNCED"
                      ? "Sincronizado"
                      : lead.crmSyncStatus === "FAILED"
                        ? "Falha"
                        : "Pendente"}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-neutral-500">ID no CRM</dt>
                <dd className="font-mono text-xs">{lead.crmLeadId ?? "—"}</dd>
              </div>
            </dl>
            {isMaster && lead.crmSyncStatus !== "SYNCED" && (
              <div className="mt-4">
                <ReprocessSyncButton leadId={lead.id} />
              </div>
            )}
          </Card>

          {/* Zona de risco — exclusão definitiva é ato do configurador */}
          {isMaster && (
            <Card tone="outlined" className="border-status-danger/30">
              <h2 className="t-eyebrow text-status-danger mb-3">Zona de risco</h2>
              <DeleteLeadForm
                leadId={lead.id}
                hasCommission={Boolean(lead.commission)}
                syncedWithCrm={Boolean(lead.crmLeadId)}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
