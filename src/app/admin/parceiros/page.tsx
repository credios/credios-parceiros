import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Handshake, Plus, Search } from "lucide-react";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ARCHETYPES } from "@/lib/credios";
import { formatDate, formatDocument, formatPercent, onlyDigits } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { PartnerStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Parceiros" };

function archetypeLabel(value: string): string {
  return ARCHETYPES.find((a) => a.value === value)?.label ?? value;
}

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { isMaster, partnerScope } = await requireAdminSession();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const where: Prisma.PartnerWhereInput = { ...partnerScope };
  if (q) {
    const digits = onlyDigits(q);
    where.OR = [
      { legalName: { contains: q, mode: "insensitive" } },
      ...(digits ? [{ document: { contains: digits } }] : []),
    ];
  }

  const partners = await prisma.partner.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { leads: true } },
      manager: { select: { name: true } },
    },
  });

  return (
    <div>
      <div className="animate-fade-up">
        <PageHeader
          title="Parceiros"
          description="Quem indica clientes para a Credios."
          action={
            <ButtonLink href="/admin/parceiros/novo">
              <Plus size={16} aria-hidden />
              Novo parceiro
            </ButtonLink>
          }
        />
      </div>

      {sp.excluido === "1" && (
        <div
          className="mb-5 rounded-md bg-status-success-bg px-4 py-3 text-sm text-status-success"
          role="status"
        >
          Parceiro excluído definitivamente. O email ficou livre para um novo
          cadastro e a ação foi registrada na auditoria.
        </div>
      )}

      <form className="animate-fade-up-1 mb-5 flex max-w-md gap-2" action="/admin/parceiros">
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou CPF/CNPJ"
          aria-label="Buscar parceiro"
        />
        <Button type="submit" variant="outline">
          <Search size={16} aria-hidden />
          Buscar
        </Button>
      </form>

      {partners.length === 0 ? (
        <div className="animate-fade-up-2">
          <EmptyState
            icon={Handshake}
            title={q ? "Nenhum parceiro encontrado" : "Nenhum parceiro ainda"}
            description={
              q
                ? "Confira a grafia ou tente buscar pelo CPF/CNPJ."
                : "Cadastre o primeiro parceiro para começar a receber indicações."
            }
            action={
              <ButtonLink href="/admin/parceiros/novo">
                <Plus size={16} aria-hidden />
                Novo parceiro
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <Card unpadded className="animate-fade-up-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-2xl text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left">
                  <th className="t-eyebrow px-5 py-3.5 text-neutral-400">
                    Nome / razão social
                  </th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Tipo</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Documento</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Status</th>
                  {isMaster && (
                    <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Gerente</th>
                  )}
                  <th className="t-eyebrow px-3 py-3.5 text-right text-neutral-400">Taxa</th>
                  <th className="t-eyebrow px-3 py-3.5 text-right text-neutral-400">
                    Leads
                  </th>
                  <th className="t-eyebrow px-5 py-3.5 text-neutral-400">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {partners.map((p) => (
                  <tr
                    key={p.id}
                    className="transition-colors duration-150 hover:bg-credios-blue-50/40"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/parceiros/${p.id}`}
                        className="font-medium text-credios-charcoal transition-colors duration-150 hover:text-credios-blue"
                      >
                        {p.legalName}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 text-neutral-600 whitespace-nowrap">
                      {archetypeLabel(p.archetype)}
                    </td>
                    <td className="px-3 py-3.5 text-neutral-600 whitespace-nowrap">
                      {formatDocument(p.document)}
                    </td>
                    <td className="px-3 py-3.5">
                      <PartnerStatusBadge status={p.status} />
                    </td>
                    {isMaster && (
                      <td className="px-3 py-3.5 text-neutral-600 whitespace-nowrap">
                        {p.manager?.name ?? "—"}
                      </td>
                    )}
                    <td className="t-money px-3 py-3.5 text-right text-credios-charcoal">
                      {formatPercent(p.commissionRate)}
                    </td>
                    <td className="t-money px-3 py-3.5 text-right text-credios-charcoal">
                      {p._count.leads}
                    </td>
                    <td className="t-caption px-5 py-3.5 text-neutral-400 whitespace-nowrap">
                      {formatDate(p.createdAt)}
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
