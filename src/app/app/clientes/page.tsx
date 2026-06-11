import Link from "next/link";
import { ChevronRight, Search, Users } from "lucide-react";
import type { LeadStatus, Prisma } from "@prisma/client";
import { requirePartnerSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_META, FUNNEL_STEPS } from "@/lib/status";
import { formatBRL, onlyDigits, timeAgo } from "@/lib/format";
import { PRODUCTS } from "@/lib/credios";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Meus clientes" };

const STATUS_OPTIONS: LeadStatus[] = [...FUNNEL_STEPS, "RECUSADO", "CANCELADO"];

function productLabel(value: string): string {
  return PRODUCTS.find((p) => p.value === value)?.label ?? value;
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { partnerId } = await requirePartnerSession();
  const params = await searchParams;

  const q = (params.q ?? "").trim();
  const status = STATUS_OPTIONS.includes(params.status as LeadStatus)
    ? (params.status as LeadStatus)
    : undefined;

  const where: Prisma.LeadWhereInput = { partnerId };
  if (status) where.status = status;
  if (q) {
    const digits = onlyDigits(q);
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      ...(digits ? [{ document: { contains: digits } }] : []),
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      product: true,
      requestedAmount: true,
      status: true,
      updatedAt: true,
    },
  });

  const hasFilters = Boolean(q || status);

  return (
    <>
      <PageHeader
        title="Meus clientes"
        description="Todas as suas indicações e o andamento de cada operação."
        action={<ButtonLink href="/app/clientes/novo">Indicar cliente</ButtonLink>}
      />

      <form method="GET" className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
            aria-hidden
          />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou CPF/CNPJ"
            aria-label="Buscar por nome ou CPF/CNPJ"
            className="pl-10"
          />
        </div>
        <Select
          name="status"
          defaultValue={status ?? ""}
          aria-label="Filtrar por status"
          className="sm:w-56"
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {leads.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasFilters ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
          description={
            hasFilters
              ? "Nenhuma indicação corresponde aos filtros. Limpe a busca e tente de novo."
              : "Você ainda não indicou nenhum cliente. Indicar leva menos de 2 minutos."
          }
          action={
            hasFilters ? (
              <ButtonLink href="/app/clientes" variant="outline">
                Limpar filtros
              </ButtonLink>
            ) : (
              <ButtonLink href="/app/clientes/novo">Indicar cliente</ButtonLink>
            )
          }
        />
      ) : (
        <>
          {/* Tabela (desktop) */}
          <Card unpadded className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left">
                  <th className="t-caption text-neutral-500 font-medium px-5 py-3">
                    Cliente
                  </th>
                  <th className="t-caption text-neutral-500 font-medium px-5 py-3">
                    Produto
                  </th>
                  <th className="t-caption text-neutral-500 font-medium px-5 py-3">
                    Valor desejado
                  </th>
                  <th className="t-caption text-neutral-500 font-medium px-5 py-3">
                    Status
                  </th>
                  <th className="t-caption text-neutral-500 font-medium px-5 py-3">
                    Última movimentação
                  </th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Abrir</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="transition-colors duration-150 hover:bg-neutral-50"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/app/clientes/${lead.id}`}
                        className="font-medium text-credios-charcoal hover:text-credios-blue transition-colors duration-150"
                      >
                        {lead.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500">
                      {productLabel(lead.product)}
                    </td>
                    <td className="px-5 py-3.5 t-money font-semibold text-credios-charcoal">
                      {formatBRL(lead.requestedAmount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="px-5 py-3.5 text-neutral-400">
                      {timeAgo(lead.updatedAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/app/clientes/${lead.id}`}
                        aria-label={`Ver ${lead.name}`}
                        className="inline-flex size-11 items-center justify-center rounded-sm text-neutral-300 transition-colors duration-150 hover:text-credios-blue"
                      >
                        <ChevronRight size={18} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Cards (mobile) */}
          <ul className="md:hidden flex flex-col gap-3">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link href={`/app/clientes/${lead.id}`} className="block">
                  <Card interactive>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-credios-charcoal truncate">
                          {lead.name}
                        </p>
                        <p className="t-caption text-neutral-500 mt-0.5">
                          {productLabel(lead.product)}
                        </p>
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-neutral-300 shrink-0 mt-1"
                        aria-hidden
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-3">
                      <LeadStatusBadge status={lead.status} />
                      <span className="t-caption text-neutral-400">
                        {timeAgo(lead.updatedAt)}
                      </span>
                    </div>
                    <p className="t-money text-lg text-credios-charcoal mt-2">
                      {formatBRL(lead.requestedAmount)}
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
