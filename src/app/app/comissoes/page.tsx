import { Download, FileText, HandCoins } from "lucide-react";
import { requirePartnerSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import { PROGRAMA } from "@/lib/credios";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { CommissionStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { InvoiceUpload } from "./invoice-upload";

export const metadata = { title: "Comissões" };

export default async function ComissoesPage() {
  const { partnerId } = await requirePartnerSession();

  const year = new Date().getFullYear();
  const startOfYear = new Date(year, 0, 1);

  const [partner, commissions, withProof, toReceive, paidThisYear] = await Promise.all([
    prisma.partner.findUniqueOrThrow({
      where: { id: partnerId },
      select: { personType: true },
    }),
    prisma.commission.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        baseAmount: true,
        rate: true,
        amount: true,
        status: true,
        paidAt: true,
        invoiceName: true,
        lead: { select: { name: true } },
      },
    }),
    prisma.commission.findMany({
      where: { partnerId, paymentProof: { not: null } },
      select: { id: true },
    }),
    prisma.commission.aggregate({
      _sum: { amount: true },
      where: { partnerId, status: "A_RECEBER" },
    }),
    prisma.commission.aggregate({
      _sum: { amount: true },
      where: { partnerId, status: "PAGA", paidAt: { gte: startOfYear } },
    }),
  ]);

  const isPJ = partner.personType === "PJ";
  const proofIds = new Set(withProof.map((c) => c.id));

  return (
    <>
      <div className="animate-fade-up">
        <PageHeader
          title="Comissões"
          description="Sua comissão é gerada automaticamente quando o crédito é liberado."
          action={
            commissions.length > 0 ? (
              <a
                href="/api/partner/commissions/export"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 min-h-11 text-sm font-semibold text-credios-blue border border-credios-blue/60 transition-colors duration-150 hover:bg-credios-blue-50"
              >
                <Download size={16} aria-hidden />
                Exportar CSV
              </a>
            ) : undefined
          }
        />
      </div>

      <div className="animate-fade-up-1 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="A receber"
          value={formatBRL(toReceive._sum.amount ?? 0)}
          icon={HandCoins}
          tone="gold"
        />
        <StatCard
          label={`Recebido em ${year}`}
          value={formatBRL(paidThisYear._sum.amount ?? 0)}
        />
      </div>

      <section className="mt-8 animate-fade-up-2">
        <h2 className="t-heading text-credios-charcoal mb-4">Extrato</h2>

        {commissions.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="Nenhuma comissão ainda"
            description={`Quando o crédito de um cliente indicado por você for liberado, sua comissão de ${formatPercent(PROGRAMA.comissaoPadrao)} sobre o valor líquido liberado é gerada automaticamente e aparece aqui como a receber.`}
          />
        ) : (
          <>
            {/* Tabela (desktop) */}
            <Card unpadded className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-left">
                    <th className="t-eyebrow text-neutral-400 px-5 py-3">
                      Cliente
                    </th>
                    <th className="t-eyebrow text-neutral-400 px-5 py-3 text-right">
                      Valor do crédito
                    </th>
                    <th className="t-eyebrow text-neutral-400 px-5 py-3">
                      Taxa
                    </th>
                    <th className="t-eyebrow text-neutral-400 px-5 py-3 text-right">
                      Comissão
                    </th>
                    <th className="t-eyebrow text-neutral-400 px-5 py-3">
                      Status
                    </th>
                    <th className="t-eyebrow text-neutral-400 px-5 py-3">
                      Pagamento
                    </th>
                    <th className="t-eyebrow text-neutral-400 px-5 py-3">
                      Comprovante
                    </th>
                    {isPJ && (
                      <th className="t-eyebrow text-neutral-400 px-5 py-3">
                        Nota fiscal
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {commissions.map((c) => (
                    <tr
                      key={c.id}
                      className="transition-colors duration-150 hover:bg-credios-blue-50/40"
                    >
                      <td className="px-5 py-4 font-medium text-credios-charcoal">
                        {c.lead.name}
                      </td>
                      <td className="px-5 py-4 text-neutral-500 text-right tabular-nums">
                        {formatBRL(c.baseAmount)}
                      </td>
                      <td className="px-5 py-4 text-neutral-500">
                        {formatPercent(c.rate)}
                      </td>
                      <td className="px-5 py-4 t-money text-credios-charcoal text-right">
                        {formatBRL(c.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <CommissionStatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-4 t-caption text-neutral-500">
                        {formatDate(c.paidAt)}
                      </td>
                      <td className="px-5 py-4">
                        {c.status === "PAGA" && proofIds.has(c.id) ? (
                          <a
                            href={`/api/partner/commissions/${c.id}/proof`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-credios-blue transition-colors duration-150 hover:text-credios-blue-700"
                          >
                            <Download size={14} aria-hidden />
                            Baixar
                          </a>
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </td>
                      {isPJ && (
                        <td className="px-5 py-3.5">
                          {c.invoiceName ? (
                            <a
                              href={`/api/partner/commissions/${c.id}/invoice`}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-credios-blue transition-colors duration-150 hover:text-credios-blue-700"
                              title={c.invoiceName}
                            >
                              <FileText size={14} aria-hidden />
                              <span className="max-w-36 truncate">{c.invoiceName}</span>
                            </a>
                          ) : (
                            <InvoiceUpload commissionId={c.id} />
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Cards (mobile) */}
            <ul className="md:hidden flex flex-col gap-3">
              {commissions.map((c) => (
                <li key={c.id}>
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-credios-charcoal">{c.lead.name}</p>
                      <CommissionStatusBadge status={c.status} />
                    </div>
                    <p className="t-money text-2xl text-credios-charcoal mt-2">
                      {formatBRL(c.amount)}
                    </p>
                    <p className="t-caption text-neutral-500 mt-1">
                      {formatPercent(c.rate)} sobre {formatBRL(c.baseAmount)}
                      {c.paidAt ? ` · pago em ${formatDate(c.paidAt)}` : ""}
                    </p>
                    {c.status === "PAGA" && proofIds.has(c.id) && (
                      <a
                        href={`/api/partner/commissions/${c.id}/proof`}
                        className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-credios-blue transition-colors duration-150 hover:text-credios-blue-700"
                      >
                        <Download size={14} aria-hidden />
                        Baixar comprovante
                      </a>
                    )}
                    {isPJ && (
                      <div className="mt-3 border-t border-black/5 pt-3">
                        <p className="t-caption text-neutral-400 mb-1.5">Nota fiscal</p>
                        {c.invoiceName ? (
                          <a
                            href={`/api/partner/commissions/${c.id}/invoice`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-credios-blue transition-colors duration-150 hover:text-credios-blue-700"
                          >
                            <FileText size={14} aria-hidden />
                            <span className="truncate">{c.invoiceName}</span>
                          </a>
                        ) : (
                          <InvoiceUpload commissionId={c.id} />
                        )}
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
