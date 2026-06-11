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
  await requireAdminSession();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const where: Prisma.PartnerWhereInput = {};
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
    include: { _count: { select: { leads: true } } },
  });

  return (
    <div>
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

      <form className="mb-5 flex max-w-md gap-2" action="/admin/parceiros">
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
      ) : (
        <Card unpadded>
          <div className="overflow-x-auto">
            <table className="w-full min-w-2xl text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-neutral-500">
                  <th className="px-5 py-3 font-medium">Nome / razão social</th>
                  <th className="px-3 py-3 font-medium">Tipo</th>
                  <th className="px-3 py-3 font-medium">Documento</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium text-right">Taxa</th>
                  <th className="px-3 py-3 font-medium text-right">Leads</th>
                  <th className="px-5 py-3 font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-neutral-100 last:border-b-0 transition-colors duration-150 hover:bg-credios-blue-50/40"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/parceiros/${p.id}`}
                        className="font-medium text-credios-charcoal transition-colors duration-150 hover:text-credios-blue"
                      >
                        {p.legalName}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-neutral-600 whitespace-nowrap">
                      {archetypeLabel(p.archetype)}
                    </td>
                    <td className="px-3 py-3 text-neutral-600 whitespace-nowrap">
                      {formatDocument(p.document)}
                    </td>
                    <td className="px-3 py-3">
                      <PartnerStatusBadge status={p.status} />
                    </td>
                    <td className="t-money px-3 py-3 text-right text-credios-charcoal">
                      {formatPercent(p.commissionRate)}
                    </td>
                    <td className="t-money px-3 py-3 text-right text-credios-charcoal">
                      {p._count.leads}
                    </td>
                    <td className="px-5 py-3 text-neutral-600 whitespace-nowrap">
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
