import Link from "next/link";
import type { Metadata } from "next";
import { HandCoins, Download, FileText } from "lucide-react";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge, CommissionStatusBadge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  CopyPixButton,
  MarkPaidForm,
  CancelCommissionForm,
} from "./commission-actions";

export const metadata: Metadata = { title: "Comissões" };

/** Início do mês/ano em Brasília. */
function periodStartsSP(): { month: Date; year: Date } {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })
    .format(new Date())
    .split("-");
  return {
    month: new Date(`${y}-${m}-01T00:00:00-03:00`),
    year: new Date(`${y}-01-01T00:00:00-03:00`),
  };
}

export default async function AdminCommissionsPage() {
  const { isMaster, partnerScope } = await requireAdminSession();
  const { month, year } = periodStartsSP();

  const [toPayAgg, paidMonthAgg, paidYearAgg, queue, history] = await Promise.all([
    prisma.commission.aggregate({
      _sum: { amount: true },
      where: { status: "A_RECEBER", partner: partnerScope },
    }),
    prisma.commission.aggregate({
      _sum: { amount: true },
      where: { status: "PAGA", paidAt: { gte: month }, partner: partnerScope },
    }),
    prisma.commission.aggregate({
      _sum: { amount: true },
      where: { status: "PAGA", paidAt: { gte: year }, partner: partnerScope },
    }),
    prisma.commission.findMany({
      where: { status: "A_RECEBER", partner: partnerScope },
      orderBy: { createdAt: "asc" },
      // Bytes (NF/comprovante) ficam fora da listagem — servidos por rota própria.
      omit: { invoice: true, paymentProof: true },
      include: {
        partner: {
          select: { id: true, legalName: true, personType: true, pixKey: true },
        },
        lead: { select: { id: true, name: true } },
      },
    }),
    prisma.commission.findMany({
      where: { status: { in: ["PAGA", "CANCELADA"] }, partner: partnerScope },
      orderBy: [{ paidAt: "desc" }, { updatedAt: "desc" }],
      take: 100,
      select: {
        id: true,
        amount: true,
        status: true,
        paidAt: true,
        paymentProofMime: true,
        partner: { select: { id: true, legalName: true } },
        lead: { select: { id: true, name: true } },
      },
    }),
  ]);

  return (
    <div>
      <div className="animate-fade-up">
        <PageHeader
          title="Comissões"
          description={
            isMaster
              ? "Fila de pagamento e histórico — pagar rápido é o coração da confiança do parceiro."
              : "Comissões da sua carteira — o pagamento é feito pela Credios."
          }
          action={
            <ButtonLink href="/api/admin/commissions/export" variant="outline">
              <Download size={16} aria-hidden />
              Exportar CSV
            </ButtonLink>
          }
        />
      </div>

      <div className="animate-fade-up-1 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="A pagar"
          value={formatBRL(toPayAgg._sum.amount ?? 0)}
          tone="dark"
          icon={HandCoins}
        />
        <StatCard label="Pago no mês" value={formatBRL(paidMonthAgg._sum.amount ?? 0)} />
        <StatCard label="Pago no ano" value={formatBRL(paidYearAgg._sum.amount ?? 0)} />
      </div>

      <h2 className="t-heading animate-fade-up-2 mt-8 mb-4 text-credios-charcoal">
        Fila a receber
      </h2>
      {queue.length === 0 ? (
        <div className="animate-fade-up-2">
          <EmptyState
            icon={HandCoins}
            title="Fila vazia"
            description="Nenhuma comissão aguardando pagamento. Quando um crédito for liberado, ela aparece aqui."
          />
        </div>
      ) : (
        <Card unpadded className="animate-fade-up-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-4xl text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left">
                  <th className="t-eyebrow px-5 py-3.5 text-neutral-400">Parceiro</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Cliente</th>
                  <th className="t-eyebrow px-3 py-3.5 text-right text-neutral-400">Base</th>
                  <th className="t-eyebrow px-3 py-3.5 text-right text-neutral-400">Taxa</th>
                  <th className="t-eyebrow px-3 py-3.5 text-right text-neutral-400">
                    Valor
                  </th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Gerada em</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Chave PIX</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">NF</th>
                  {isMaster && (
                    <th className="t-eyebrow px-5 py-3.5 text-neutral-400">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {queue.map((c) => (
                  <tr key={c.id} className="align-top">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/parceiros/${c.partner.id}`}
                        className="font-medium text-credios-charcoal transition-colors duration-150 hover:text-credios-blue"
                      >
                        {c.partner.legalName}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5">
                      <Link
                        href={`/admin/leads/${c.lead.id}`}
                        className="text-neutral-600 transition-colors duration-150 hover:text-credios-blue"
                      >
                        {c.lead.name}
                      </Link>
                    </td>
                    <td className="t-money px-3 py-3.5 text-right whitespace-nowrap">
                      {formatBRL(c.baseAmount)}
                    </td>
                    <td className="t-money px-3 py-3.5 text-right whitespace-nowrap">
                      {formatPercent(c.rate)}
                    </td>
                    <td className="t-money px-3 py-3.5 text-right text-lg whitespace-nowrap text-credios-gold-700">
                      {formatBRL(c.amount)}
                    </td>
                    <td className="t-caption px-3 py-3.5 text-neutral-400 whitespace-nowrap">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="px-3 py-3.5">
                      {c.partner.pixKey ? (
                        <CopyPixButton pixKey={c.partner.pixKey} />
                      ) : (
                        <span className="t-caption text-neutral-400">não cadastrada</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {c.invoiceName || c.invoiceMime ? (
                        <Link
                          href={`/api/admin/commissions/${c.id}/invoice`}
                          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-credios-blue transition-colors duration-150 hover:text-credios-blue-700"
                        >
                          <FileText size={14} aria-hidden />
                          Baixar NF
                        </Link>
                      ) : c.partner.personType === "PJ" ? (
                        <Badge tone="warning">aguardando NF</Badge>
                      ) : (
                        <span className="t-caption text-neutral-400">—</span>
                      )}
                    </td>
                    {isMaster && (
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col items-start gap-2">
                          <MarkPaidForm commissionId={c.id} />
                          <CancelCommissionForm commissionId={c.id} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <h2 className="t-heading mt-10 mb-4 text-credios-charcoal">Histórico</h2>
      {history.length === 0 ? (
        <p className="t-body text-neutral-500">Nenhuma comissão paga ou cancelada ainda.</p>
      ) : (
        <Card unpadded>
          <div className="overflow-x-auto">
            <table className="w-full min-w-2xl text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left">
                  <th className="t-eyebrow px-5 py-3.5 text-neutral-400">Parceiro</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Cliente</th>
                  <th className="t-eyebrow px-3 py-3.5 text-right text-neutral-400">
                    Valor
                  </th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Status</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Pagamento</th>
                  <th className="t-eyebrow px-5 py-3.5 text-neutral-400">Comprovante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {history.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/parceiros/${c.partner.id}`}
                        className="font-medium text-credios-charcoal transition-colors duration-150 hover:text-credios-blue"
                      >
                        {c.partner.legalName}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 text-neutral-600">{c.lead.name}</td>
                    <td className="t-money px-3 py-3.5 text-right whitespace-nowrap">
                      {formatBRL(c.amount)}
                    </td>
                    <td className="px-3 py-3.5">
                      <CommissionStatusBadge status={c.status} />
                    </td>
                    <td className="t-caption px-3 py-3.5 text-neutral-400 whitespace-nowrap">
                      {formatDate(c.paidAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      {c.paymentProofMime ? (
                        <Link
                          href={`/api/admin/commissions/${c.id}/proof`}
                          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-credios-blue transition-colors duration-150 hover:text-credios-blue-700"
                        >
                          <FileText size={14} aria-hidden />
                          Baixar
                        </Link>
                      ) : (
                        <span className="t-caption text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
