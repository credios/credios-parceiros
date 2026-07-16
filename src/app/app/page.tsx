import Link from "next/link";
import {
  Users,
  TrendingUp,
  HandCoins,
  Wallet,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { requirePartnerSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TERMINAL_STATUSES } from "@/lib/status";
import { formatBRL, timeAgo } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { partnerId } = await requirePartnerSession();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, thisMonth, inProgress, toReceive, received, recent] = await Promise.all([
    prisma.lead.count({ where: { partnerId } }),
    prisma.lead.count({ where: { partnerId, createdAt: { gte: startOfMonth } } }),
    prisma.lead.count({
      where: { partnerId, status: { notIn: TERMINAL_STATUSES } },
    }),
    prisma.commission.aggregate({
      _sum: { amount: true },
      where: { partnerId, status: "A_RECEBER" },
    }),
    prisma.commission.aggregate({
      _sum: { amount: true },
      where: { partnerId, status: "PAGA" },
    }),
    prisma.lead.findMany({
      where: { partnerId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, name: true, status: true, updatedAt: true },
    }),
  ]);

  if (total === 0) {
    return (
      <>
        <div className="animate-fade-up">
          <PageHeader
            title="Bem-vindo ao portal"
            description="Indique clientes, acompanhe cada etapa e receba sua comissão."
          />
        </div>
        <div className="animate-fade-up-1 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-200 bg-white px-8 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-credios-blue-50 to-credios-blue-100">
            <Sparkles size={24} className="text-credios-blue" aria-hidden />
          </span>
          <h2 className="t-heading text-credios-charcoal">
            Sua primeira indicação começa aqui
          </h2>
          <p className="t-body text-neutral-500 max-w-md">
            O fluxo é simples — e você acompanha tudo por aqui, em tempo real.
          </p>
          <ol className="grid gap-3 sm:grid-cols-3 text-left max-w-2xl w-full mt-4">
            {[
              ["1. Indique", "Cadastre o cliente em menos de 2 minutos, direto do celular."],
              ["2. Acompanhe", "Nossa equipe cuida de tudo e você vê cada etapa da operação."],
              ["3. Receba", "Crédito liberado, comissão de 2,00% gerada automaticamente."],
            ].map(([title, text]) => (
              <li key={title} className="rounded-md bg-credios-ivory p-4">
                <p className="text-sm font-semibold text-credios-charcoal">{title}</p>
                <p className="t-caption text-neutral-500 mt-1">{text}</p>
              </li>
            ))}
          </ol>
          <ButtonLink href="/app/clientes/novo" size="lg" className="mt-4">
            Indicar meu primeiro cliente
          </ButtonLink>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="animate-fade-up">
        <PageHeader
          title="Dashboard"
          description="O resumo das suas indicações e comissões."
          action={<ButtonLink href="/app/clientes/novo">Indicar cliente</ButtonLink>}
        />
      </div>

      <div className="animate-fade-up-1 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Clientes indicados"
          value={String(total)}
          sub={`${thisMonth} neste mês`}
          icon={Users}
        />
        <StatCard
          label="Operações em andamento"
          value={String(inProgress)}
          icon={TrendingUp}
        />
        <StatCard
          label="Comissões a receber"
          value={formatBRL(toReceive._sum.amount ?? 0)}
          icon={HandCoins}
          tone="dark"
        />
        <StatCard
          label="Comissões recebidas"
          value={formatBRL(received._sum.amount ?? 0)}
          sub="acumulado"
          icon={Wallet}
        />
      </div>

      <section className="mt-8 animate-fade-up-2">
        <h2 className="t-heading text-credios-charcoal mb-4">Movimentações recentes</h2>
        <Card unpadded>
          <ul className="divide-y divide-black/5">
            {recent.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/app/clientes/${lead.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 min-h-11 transition-colors duration-150 hover:bg-credios-blue-50/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0">
                    <p className="text-sm font-medium text-credios-charcoal truncate">
                      {lead.name}
                    </p>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="t-caption text-neutral-400">
                      {timeAgo(lead.updatedAt)}
                    </span>
                    <ChevronRight size={16} className="text-neutral-300" aria-hidden />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </>
  );
}
