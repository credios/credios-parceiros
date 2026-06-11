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
  await requireAdminSession();
  const { month, year } = periodStartsSP();

  const [toPayAgg, paidMonthAgg, paidYearAgg, queue, history] = await Promise.all([
    prisma.commission.aggregate({
      _sum: { amount: true },
      where: { status: "A_RECEBER" },
    }),
    prisma.commission.aggregate({
      _sum: { amount: true },
      where: { status: "PAGA", paidAt: { gte: month } },
    }),
    prisma.commission.aggregate({
      _sum: { amount: true },
      where: { status: "PAGA", paidAt: { gte: year } },
    }),
    prisma.commission.findMany({
      where: { status: "A_RECEBER" },
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
      where: { status: { in: ["PAGA", "CANCELADA"] } },
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
      <PageHeader
        title="Comissões"
        description="Fila de pagamento e histórico — pagar rápido é o coração da confiança do parceiro."
        action={
          <ButtonLink href="/api/admin/commissions/export" variant="outline">
            <Download size={16} aria-hidden />
            Exportar CSV
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="A pagar"
          value={formatBRL(toPayAgg._sum.amount ?? 0)}
          tone="dark"
          icon={HandCoins}
        />
        <StatCard label="Pago no mês" value={formatBRL(paidMonthAgg._sum.amount ?? 0)} />
        <StatCard label="Pago no ano" value={formatBRL(paidYearAgg._sum.amount ?? 0)} />
      </div>

      <h2 className="t-heading mt-8 mb-4 text-credios-charcoal">Fila a receber</h2>
      {queue.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Fila vazia"
          description="Nenhuma comissão aguardando pagamento. Quando um crédito for liberado, ela aparece aqui."
        />
      ) : (
        <Card unpadded>
          <div className="overflow-x-auto">
            <table className="w-full min-w-4xl text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-neutral-500">
                  <th className="px-5 py-3 font-medium">Parceiro</th>
                  <th className="px-3 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium text-right">Base</th>
                  <th className="px-3 py-3 font-medium text-right">Taxa</th>
                  <th className="px-3 py-3 font-medium text-right">Valor</th>
                  <th className="px-3 py-3 font-medium">Gerada em</th>
                  <th className="px-3 py-3 font-medium">Chave PIX</th>
                  <th className="px-3 py-3 font-medium">NF</th>
                  <th className="px-5 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-neutral-100 align-top last:border-b-0"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/parceiros/${c.partner.id}`}
                        className="font-medium text-credios-charcoal transition-colors duration-150 hover:text-credios-blue"
                      >
                        {c.partner.legalName}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/leads/${c.lead.id}`}
                        className="text-neutral-600 transition-colors duration-150 hover:text-credios-blue"
                      >
                        {c.lead.name}
                      </Link>
                    </td>
                    <td className="t-money px-3 py-3 text-right whitespace-nowrap">
                      {formatBRL(c.baseAmount)}
                    </td>
                    <td className="t-money px-3 py-3 text-right whitespace-nowrap">
                      {formatPercent(c.rate)}
                    </td>
                    <td className="t-money px-3 py-3 text-right whitespace-nowrap text-credios-gold-700">
                      {formatBRL(c.amount)}
                    </td>
                    <td className="px-3 py-3 text-neutral-500 whitespace-nowrap">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      {c.partner.pixKey ? (
                        <CopyPixButton pixKey={c.partner.pixKey} />
                      ) : (
                        <span className="t-caption text-neutral-400">não cadastrada</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
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
                    <td className="px-5 py-3">
                      <div className="flex flex-col items-start gap-2">
                        <MarkPaidForm commissionId={c.id} />
                        <CancelCommissionForm commissionId={c.id} />
                      </div>
                    </td>
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
                <tr className="border-b border-neutral-100 text-left text-neutral-500">
                  <th className="px-5 py-3 font-medium">Parceiro</th>
                  <th className="px-3 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium text-right">Valor</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Pagamento</th>
                  <th className="px-5 py-3 font-medium">Comprovante</th>
                </tr>
              </thead>
              <tbody>
                {history.map((c) => (
                  <tr key={c.id} className="border-b border-neutral-100 last:border-b-0">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/parceiros/${c.partner.id}`}
                        className="font-medium text-credios-charcoal transition-colors duration-150 hover:text-credios-blue"
                      >
                        {c.partner.legalName}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-neutral-600">{c.lead.name}</td>
                    <td className="t-money px-3 py-3 text-right whitespace-nowrap">
                      {formatBRL(c.amount)}
                    </td>
                    <td className="px-3 py-3">
                      <CommissionStatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-3 text-neutral-500 whitespace-nowrap">
                      {formatDate(c.paidAt)}
                    </td>
                    <td className="px-5 py-3">
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
