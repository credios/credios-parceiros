import Link from "next/link";
import type { Metadata } from "next";
import type { LeadStatus } from "@prisma/client";
import {
  CalendarDays,
  CalendarRange,
  Handshake,
  Snowflake,
  Plug,
  HandCoins,
  ArrowRight,
} from "lucide-react";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_META, FUNNEL_STEPS } from "@/lib/status";
import { formatBRL } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Visão geral" };

const COOLING_DAYS = 60;
const DAY_MS = 24 * 60 * 60_000;

/** Início do dia de hoje em Brasília (UTC-3, sem DST desde 2019). */
function startOfTodaySP(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date()); // "yyyy-mm-dd"
  return new Date(`${parts}T00:00:00-03:00`);
}

/** Cortes temporais do dashboard, calculados uma única vez por request. */
function dashboardCutoffs() {
  const nowMs = Date.now();
  return {
    nowMs,
    today: startOfTodaySP(),
    weekAgo: new Date(nowMs - 7 * DAY_MS),
    coolingCutoff: new Date(nowMs - COOLING_DAYS * DAY_MS),
  };
}

export default async function AdminDashboardPage() {
  const { isMaster, partnerScope } = await requireAdminSession();

  const { nowMs, today, weekAgo, coolingCutoff } = dashboardCutoffs();

  const [
    leadsToday,
    leadsWeek,
    toPay,
    activePartnersCount,
    funnelGroups,
    activePartners,
    syncFailed,
    syncPending,
    queuedCommissions,
  ] = await Promise.all([
    prisma.lead.count({
      where: { createdAt: { gte: today }, partner: partnerScope },
    }),
    prisma.lead.count({
      where: { createdAt: { gte: weekAgo }, partner: partnerScope },
    }),
    prisma.commission.aggregate({
      _sum: { amount: true },
      where: { status: "A_RECEBER", partner: partnerScope },
    }),
    prisma.partner.count({ where: { status: "ACTIVE", ...partnerScope } }),
    prisma.lead.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { partner: partnerScope },
    }),
    prisma.partner.findMany({
      where: { status: "ACTIVE", ...partnerScope },
      select: {
        id: true,
        legalName: true,
        createdAt: true,
        leads: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.lead.count({ where: { crmSyncStatus: "FAILED", partner: partnerScope } }),
    prisma.lead.count({ where: { crmSyncStatus: "PENDING", partner: partnerScope } }),
    prisma.commission.findMany({
      where: { status: "A_RECEBER", partner: partnerScope },
      orderBy: { createdAt: "asc" },
      take: 5,
      include: {
        partner: { select: { legalName: true } },
        lead: { select: { name: true } },
      },
    }),
  ]);

  const countByStatus: Partial<Record<LeadStatus, number>> = {};
  for (const g of funnelGroups) countByStatus[g.status] = g._count._all;
  const maxFunnel = Math.max(1, ...FUNNEL_STEPS.map((s) => countByStatus[s] ?? 0));

  const coolingPartners = activePartners
    .map((p) => {
      const lastLeadAt = p.leads[0]?.createdAt ?? null;
      const reference = lastLeadAt ?? p.createdAt;
      return {
        id: p.id,
        legalName: p.legalName,
        lastLeadAt,
        days: Math.floor((nowMs - reference.getTime()) / DAY_MS),
      };
    })
    .filter((p) => (p.lastLeadAt ?? new Date(0)) < coolingCutoff && p.days >= COOLING_DAYS)
    .sort((a, b) => b.days - a.days)
    .slice(0, 8);

  return (
    <div>
      <div className="animate-fade-up">
        <PageHeader
          title="Visão geral"
          description="O pulso da operação de parcerias em uma tela."
        />
      </div>

      <div className="animate-fade-up-1 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Leads hoje" value={String(leadsToday)} icon={CalendarDays} />
        <StatCard
          label="Leads na semana"
          value={String(leadsWeek)}
          icon={CalendarRange}
          sub="últimos 7 dias"
        />
        <StatCard
          label="Comissões a pagar"
          value={formatBRL(toPay._sum.amount ?? 0)}
          icon={HandCoins}
          tone="dark"
        />
        <StatCard
          label="Parceiros ativos"
          value={String(activePartnersCount)}
          icon={Handshake}
        />
      </div>

      <div className="animate-fade-up-2 mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Funil por status */}
        <Card className="xl:col-span-3">
          <h2 className="t-heading text-credios-charcoal">Funil por status</h2>
          <ul className="mt-5 flex flex-col gap-3">
            {FUNNEL_STEPS.map((status) => {
              const count = countByStatus[status] ?? 0;
              const pct = Math.round((count / maxFunnel) * 100);
              return (
                <li key={status} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-sm text-neutral-600 truncate">
                    {STATUS_META[status].label}
                  </span>
                  <span className="relative h-2 flex-1 rounded-full bg-neutral-100">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-credios-blue transition-[width] duration-500 ease-out"
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                  </span>
                  <span className="t-money w-10 shrink-0 text-right text-sm text-credios-charcoal">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 border-t border-neutral-100 pt-4">
            {(["RECUSADO", "CANCELADO", "EXCLUIDO"] as const).map((status) => (
              <p key={status} className="t-caption text-neutral-500">
                {STATUS_META[status].label}:{" "}
                <span className="t-money text-neutral-600">
                  {countByStatus[status] ?? 0}
                </span>
              </p>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-6 xl:col-span-2">
          {/* Parceiros esfriando */}
          <Card>
            <div className="flex items-center gap-2">
              <Snowflake size={18} className="text-credios-blue" aria-hidden />
              <h2 className="t-heading text-credios-charcoal">Parceiros esfriando</h2>
            </div>
            <p className="t-caption mt-1 text-neutral-500">
              Ativos sem indicação há {COOLING_DAYS}+ dias — sinal de churn.
            </p>
            {coolingPartners.length === 0 ? (
              <p className="t-body mt-4 text-neutral-500">
                Nenhum parceiro esfriando. Boa.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col divide-y divide-neutral-100">
                {coolingPartners.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/parceiros/${p.id}`}
                      className="-mx-2 flex min-h-11 items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors duration-150 hover:bg-neutral-50 hover:text-credios-blue"
                    >
                      <span className="truncate text-sm font-medium">{p.legalName}</span>
                      <span className="t-caption shrink-0 text-neutral-500">
                        {p.lastLeadAt
                          ? `há ${p.days} dias`
                          : `nunca indicou (${p.days} dias)`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Integração — só o configurador opera o CRM */}
          {isMaster && (
          <Card>
            <div className="flex items-center gap-2">
              <Plug size={18} className="text-credios-blue" aria-hidden />
              <h2 className="t-heading text-credios-charcoal">Integração</h2>
            </div>
            <div className="mt-4 flex items-end gap-6">
              <div>
                <p className="t-eyebrow text-neutral-500">Falhas</p>
                <p className="t-money mt-1 text-2xl text-status-danger">{syncFailed}</p>
              </div>
              <div>
                <p className="t-eyebrow text-neutral-500">Pendentes</p>
                <p className="t-money mt-1 text-2xl text-status-warning">{syncPending}</p>
              </div>
            </div>
            <Link
              href="/admin/integracoes"
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-credios-blue transition-colors duration-150 hover:text-credios-blue-700"
            >
              Ver fila de reprocessamento
              <ArrowRight size={15} aria-hidden />
            </Link>
          </Card>
          )}

          {/* Comissões na fila */}
          <Card>
            <div className="flex items-center gap-2">
              <HandCoins size={18} className="text-credios-gold-700" aria-hidden />
              <h2 className="t-heading text-credios-charcoal">Comissões na fila</h2>
            </div>
            {queuedCommissions.length === 0 ? (
              <p className="t-body mt-4 text-neutral-500">Nenhuma comissão a pagar.</p>
            ) : (
              <ul className="mt-4 flex flex-col divide-y divide-neutral-100">
                {queuedCommissions.map((c) => (
                  <li key={c.id} className="flex min-h-11 items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.partner.legalName}</p>
                      <p className="t-caption truncate text-neutral-500">{c.lead.name}</p>
                    </div>
                    <span className="t-money shrink-0 text-sm text-credios-charcoal">
                      {formatBRL(c.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/comissoes"
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-credios-blue transition-colors duration-150 hover:text-credios-blue-700"
            >
              Abrir fila de pagamento
              <ArrowRight size={15} aria-hidden />
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
