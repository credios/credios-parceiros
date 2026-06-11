import Link from "next/link";
import type { Metadata } from "next";
import { Prisma, type LeadStatus } from "@prisma/client";
import { Users, Search } from "lucide-react";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PRODUCTS } from "@/lib/credios";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/cn";
import { formatBRL, onlyDigits, timeAgo } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { LeadStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Leads" };

const PAGE_SIZE = 50;

const SYNC_DOT: Record<string, { className: string; title: string }> = {
  SYNCED: { className: "bg-status-success", title: "Sincronizado com o CRM" },
  PENDING: {
    className: "bg-status-warning animate-pulse-soft",
    title: "Aguardando sync com o CRM",
  },
  FAILED: { className: "bg-status-danger", title: "Falha de sync com o CRM" },
};

function SyncDot({ status }: { status: string }) {
  const meta = SYNC_DOT[status] ?? SYNC_DOT.PENDING;
  return (
    <span
      title={meta.title}
      className={cn("inline-block size-2.5 rounded-full", meta.className)}
    />
  );
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const partnerId = typeof sp.parceiro === "string" ? sp.parceiro : "";
  const statusParam = typeof sp.status === "string" ? sp.status : "";
  const product = typeof sp.produto === "string" ? sp.produto : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const status = (
    Object.keys(STATUS_META).includes(statusParam) ? statusParam : undefined
  ) as LeadStatus | undefined;

  const where: Prisma.LeadWhereInput = {};
  if (q) {
    const digits = onlyDigits(q);
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      ...(digits ? [{ document: { contains: digits } }] : []),
    ];
  }
  if (partnerId) where.partnerId = partnerId;
  if (status) where.status = status;
  if (product && PRODUCTS.some((p) => p.value === product)) where.product = product;

  const [leads, total, partners] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { partner: { select: { id: true, legalName: true } } },
    }),
    prisma.lead.count({ where }),
    prisma.partner.findMany({
      select: { id: true, legalName: true },
      orderBy: { legalName: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (partnerId) params.set("parceiro", partnerId);
    if (status) params.set("status", status);
    if (product) params.set("produto", product);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/leads?${qs}` : "/admin/leads";
  };

  const productLabel = (value: string) =>
    PRODUCTS.find((p) => p.value === value)?.label ?? value;

  return (
    <div>
      <div className="animate-fade-up">
        <PageHeader
          title="Leads"
          description="Todas as indicações dos parceiros, com filtros e estado do sync."
        />
      </div>

      <form
        className="animate-fade-up-1 mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
        action="/admin/leads"
      >
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Nome ou CPF/CNPJ do cliente"
          aria-label="Buscar lead"
        />
        <Select name="parceiro" defaultValue={partnerId} aria-label="Filtrar por parceiro">
          <option value="">Todos os parceiros</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.legalName}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={statusParam} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_META) as LeadStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
        <Select name="produto" defaultValue={product} aria-label="Filtrar por produto">
          <option value="">Todos os produtos</option>
          {PRODUCTS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          <Search size={16} aria-hidden />
          Filtrar
        </Button>
      </form>

      {leads.length === 0 ? (
        <div className="animate-fade-up-2">
          <EmptyState
            icon={Users}
            title="Nenhum lead encontrado"
            description="Ajuste os filtros ou aguarde novas indicações dos parceiros."
          />
        </div>
      ) : (
        <div className="animate-fade-up-2">
          <Card unpadded>
            <div className="overflow-x-auto">
              <table className="w-full min-w-3xl text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-left">
                    <th className="t-eyebrow px-5 py-3.5 text-neutral-400">Cliente</th>
                    <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Parceiro</th>
                    <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Produto</th>
                    <th className="t-eyebrow px-3 py-3.5 text-right text-neutral-400">
                      Valor desejado
                    </th>
                    <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Status</th>
                    <th className="t-eyebrow px-3 py-3.5 text-center text-neutral-400">
                      CRM
                    </th>
                    <th className="t-eyebrow px-5 py-3.5 text-neutral-400">Atualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="transition-colors duration-150 hover:bg-credios-blue-50/40"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="font-medium text-credios-charcoal transition-colors duration-150 hover:text-credios-blue"
                        >
                          {lead.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3.5 text-neutral-600">
                        <Link
                          href={`/admin/parceiros/${lead.partner.id}`}
                          className="transition-colors duration-150 hover:text-credios-blue"
                        >
                          {lead.partner.legalName}
                        </Link>
                      </td>
                      <td className="px-3 py-3.5 text-neutral-600 whitespace-nowrap">
                        {productLabel(lead.product)}
                      </td>
                      <td className="t-money px-3 py-3.5 text-right whitespace-nowrap">
                        {formatBRL(lead.requestedAmount)}
                      </td>
                      <td className="px-3 py-3.5">
                        <LeadStatusBadge status={lead.status} />
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <SyncDot status={lead.crmSyncStatus} />
                      </td>
                      <td className="t-caption px-5 py-3.5 text-neutral-400 whitespace-nowrap">
                        {timeAgo(lead.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="t-caption text-neutral-500">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} de {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <ButtonLink href={makeHref(page - 1)} variant="outline">
                  Anterior
                </ButtonLink>
              )}
              {page < totalPages && (
                <ButtonLink href={makeHref(page + 1)} variant="outline">
                  Carregar mais
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
