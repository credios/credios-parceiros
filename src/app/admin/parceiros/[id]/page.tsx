import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MailCheck, Users } from "lucide-react";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ARCHETYPES } from "@/lib/credios";
import { TERMINAL_STATUSES } from "@/lib/status";
import {
  formatBRL,
  formatDate,
  formatDocument,
  formatPercent,
  formatPhone,
  timeAgo,
} from "@/lib/format";
import { Card } from "@/components/ui/card";
import {
  PartnerStatusBadge,
  LeadStatusBadge,
  CommissionStatusBadge,
  Badge,
} from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { DeletePartnerForm } from "./delete-partner-form";
import {
  ResendInviteForm,
  SuspendPartnerForm,
  ReactivatePartnerForm,
  RateForm,
  EditPartnerForm,
  ReassignManagerForm,
} from "./partner-actions";

export const metadata: Metadata = { title: "Parceiro" };

export default async function AdminPartnerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { isMaster, partnerScope } = await requireAdminSession();
  const { id } = await params;
  const sp = await searchParams;
  const justInvited = sp.convidado === "1";

  // Escopo de carteira: gerente só abre parceiros que são dele.
  const partner = await prisma.partner.findFirst({
    where: { id, ...partnerScope },
    include: {
      manager: { select: { id: true, name: true } },
      leads: {
        orderBy: { createdAt: "desc" },
        include: { commission: { select: { id: true } } },
      },
      commissions: {
        orderBy: { createdAt: "desc" },
        include: { lead: { select: { name: true } } },
      },
    },
  });
  if (!partner) notFound();

  const managers = isMaster
    ? await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "ADMIN_MASTER"] }, passwordHash: { not: null } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const totalLeads = partner.leads.length;
  const inProgress = partner.leads.filter(
    (l) => !TERMINAL_STATUSES.includes(l.status)
  ).length;
  const released = partner.leads.filter((l) => l.status === "LIBERADO").length;
  const conversion = totalLeads > 0 ? Math.round((released / totalLeads) * 100) : 0;
  const paidTotal = partner.commissions
    .filter((c) => c.status === "PAGA")
    .reduce((acc, c) => acc + Number(c.amount), 0);
  const pendingTotal = partner.commissions
    .filter((c) => c.status === "A_RECEBER")
    .reduce((acc, c) => acc + Number(c.amount), 0);

  const archetypeLabel =
    ARCHETYPES.find((a) => a.value === partner.archetype)?.label ?? partner.archetype;

  const metrics = [
    { label: "Leads totais", value: String(totalLeads) },
    { label: "Em andamento", value: String(inProgress) },
    { label: "Liberados", value: String(released) },
    { label: "Conversão", value: `${conversion}%` },
    { label: "Comissões pagas", value: formatBRL(paidTotal) },
    { label: "A receber", value: formatBRL(pendingTotal) },
  ];

  return (
    <div>
      {justInvited && (
        <div className="mb-6 flex items-center gap-3 rounded-md bg-status-success-bg px-4 py-3 text-sm text-status-success">
          <MailCheck size={18} aria-hidden />
          Parceiro criado e convite enviado para {partner.email}. O link vale por 7 dias.
        </div>
      )}

      <PageHeader
        title={partner.legalName}
        description={`Parceiro desde ${formatDate(partner.createdAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {partner.status === "INVITED" && <ResendInviteForm partnerId={partner.id} />}
            {isMaster &&
              (partner.status === "SUSPENDED" || partner.status === "INACTIVE" ? (
                <ReactivatePartnerForm partnerId={partner.id} />
              ) : (
                <SuspendPartnerForm partnerId={partner.id} />
              ))}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <PartnerStatusBadge status={partner.status} />
        <Badge tone="neutral">{archetypeLabel}</Badge>
        <Badge tone="neutral">
          {partner.personType === "PJ" ? "Pessoa jurídica" : "Pessoa física"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map((m) => (
          <Card key={m.label} unpadded className="p-4">
            <p className="t-eyebrow text-neutral-500">{m.label}</p>
            <p className="t-money mt-1.5 text-xl text-credios-charcoal">{m.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-1">
          <Card>
            <h2 className="t-heading text-credios-charcoal">Cadastro</h2>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <div>
                <dt className="t-eyebrow text-neutral-400">Gerente responsável</dt>
                <dd className="mt-1 font-medium">{partner.manager?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="t-eyebrow text-neutral-400">CPF/CNPJ</dt>
                <dd className="mt-1 font-medium">{formatDocument(partner.document)}</dd>
              </div>
              {partner.personType === "PJ" && partner.repName && (
                <div>
                  <dt className="t-eyebrow text-neutral-400">Representante legal</dt>
                  <dd className="mt-1 font-medium">
                    {partner.repName}
                    {partner.repDocument && ` — ${formatDocument(partner.repDocument)}`}
                  </dd>
                </div>
              )}
              <div>
                <dt className="t-eyebrow text-neutral-400">Email</dt>
                <dd className="mt-1 font-medium break-all">{partner.email}</dd>
              </div>
              <div>
                <dt className="t-eyebrow text-neutral-400">Telefone</dt>
                <dd className="mt-1 font-medium">{formatPhone(partner.phone)}</dd>
              </div>
              <div>
                <dt className="t-eyebrow text-neutral-400">Localização</dt>
                <dd className="mt-1 font-medium">
                  {partner.city ? `${partner.city}${partner.state ? `/${partner.state}` : ""}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="t-eyebrow text-neutral-400">Chave PIX</dt>
                <dd className="mt-1 font-medium break-all">{partner.pixKey ?? "—"}</dd>
              </div>
              {partner.notes && (
                <div>
                  <dt className="t-eyebrow text-neutral-400">Notas internas</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-neutral-600">{partner.notes}</dd>
                </div>
              )}
            </dl>
            <div className="mt-5 border-t border-neutral-100 pt-4">
              <EditPartnerForm
                partnerId={partner.id}
                defaults={{
                  legalName: partner.legalName,
                  document: partner.document,
                  email: partner.email,
                  phone: partner.phone,
                  notes: partner.notes ?? "",
                }}
              />
            </div>
            {isMaster && (
              <div className="mt-5 border-t border-neutral-100 pt-4">
                <ReassignManagerForm
                  partnerId={partner.id}
                  currentManagerId={partner.manager?.id ?? null}
                  managers={managers}
                />
              </div>
            )}
          </Card>

          <Card>
            <h2 className="t-heading text-credios-charcoal">Comissão</h2>
            <p className="t-money mt-2 text-2xl text-credios-charcoal">
              {formatPercent(partner.commissionRate)}
            </p>
            {isMaster && (
              <div className="mt-4 border-t border-neutral-100 pt-4">
                <RateForm
                  partnerId={partner.id}
                  currentRate={Number(partner.commissionRate).toFixed(2).replace(".", ",")}
                />
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card unpadded>
            <div className="px-5 pt-5 sm:px-6">
              <h2 className="t-heading text-credios-charcoal">Leads indicados</h2>
            </div>
            {partner.leads.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-6 text-sm text-neutral-500 sm:px-6">
                <Users size={18} aria-hidden />
                Este parceiro ainda não indicou nenhum cliente.
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-lg text-sm">
                  <thead>
                    <tr className="border-b border-black/5 text-left">
                      <th className="t-eyebrow px-5 py-3.5 text-neutral-400 sm:px-6">
                        Cliente
                      </th>
                      <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Status</th>
                      <th className="t-eyebrow px-3 py-3.5 text-right text-neutral-400">
                        Valor desejado
                      </th>
                      <th className="t-eyebrow px-5 py-3.5 text-neutral-400 sm:px-6">
                        Atualizado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {partner.leads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="transition-colors duration-150 hover:bg-credios-blue-50/40"
                      >
                        <td className="px-5 py-3.5 sm:px-6">
                          <Link
                            href={`/admin/leads/${lead.id}`}
                            className="font-medium text-credios-charcoal transition-colors duration-150 hover:text-credios-blue"
                          >
                            {lead.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3.5">
                          <LeadStatusBadge status={lead.status} />
                        </td>
                        <td className="t-money px-3 py-3.5 text-right whitespace-nowrap">
                          {formatBRL(lead.requestedAmount)}
                        </td>
                        <td className="t-caption px-5 py-3.5 text-neutral-400 whitespace-nowrap sm:px-6">
                          {timeAgo(lead.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card unpadded>
            <div className="px-5 pt-5 sm:px-6">
              <h2 className="t-heading text-credios-charcoal">Comissões</h2>
            </div>
            {partner.commissions.length === 0 ? (
              <p className="px-5 py-6 text-sm text-neutral-500 sm:px-6">
                Nenhuma comissão gerada ainda.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-lg text-sm">
                  <thead>
                    <tr className="border-b border-black/5 text-left">
                      <th className="t-eyebrow px-5 py-3.5 text-neutral-400 sm:px-6">
                        Cliente
                      </th>
                      <th className="t-eyebrow px-3 py-3.5 text-right text-neutral-400">
                        Base
                      </th>
                      <th className="t-eyebrow px-3 py-3.5 text-right text-neutral-400">
                        Valor
                      </th>
                      <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Status</th>
                      <th className="t-eyebrow px-5 py-3.5 text-neutral-400 sm:px-6">
                        Gerada em
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {partner.commissions.map((c) => (
                      <tr key={c.id}>
                        <td className="px-5 py-3.5 font-medium sm:px-6">{c.lead.name}</td>
                        <td className="t-money px-3 py-3.5 text-right whitespace-nowrap">
                          {formatBRL(c.baseAmount)}
                        </td>
                        <td className="t-money px-3 py-3.5 text-right whitespace-nowrap">
                          {formatBRL(c.amount)}
                        </td>
                        <td className="px-3 py-3.5">
                          <CommissionStatusBadge status={c.status} />
                        </td>
                        <td className="t-caption px-5 py-3.5 text-neutral-400 whitespace-nowrap sm:px-6">
                          {formatDate(c.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Zona de risco — exclusão definitiva (master) */}
          {isMaster && (
            <Card tone="outlined" className="border-status-danger/30">
              <h2 className="t-eyebrow text-status-danger mb-3">Zona de risco</h2>
              <DeletePartnerForm
                partnerId={partner.id}
                hasCommissions={partner.commissions.length > 0}
                leadCount={partner.leads.length}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
