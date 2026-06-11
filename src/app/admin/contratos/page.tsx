import Link from "next/link";
import type { Metadata } from "next";
import { FileSignature, PenLine, Plus, Download } from "lucide-react";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge, ContractStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ResendContractButton } from "./contract-actions";

export const metadata: Metadata = { title: "Contratos" };

export default async function AdminContractsPage() {
  await requireAdminSession();

  const [templates, contracts] = await Promise.all([
    prisma.contractTemplate.findMany({
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        name: true,
        active: true,
        createdAt: true,
        _count: { select: { contracts: true } },
      },
    }),
    prisma.contract.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        verifyCode: true,
        sentAt: true,
        viewedAt: true,
        signedAt: true,
        createdAt: true,
        partner: { select: { id: true, legalName: true } },
      },
    }),
  ]);

  return (
    <div>
      <div className="animate-fade-up">
        <PageHeader
          title="Contratos"
          description="Templates do contrato de parceria e os contratos emitidos para assinatura."
          action={
            <ButtonLink href="/admin/contratos/novo-template" variant="outline">
              <Plus size={16} aria-hidden />
              Nova versão do template
            </ButtonLink>
          }
        />
      </div>

      <h2 className="t-heading animate-fade-up-1 mb-4 text-credios-charcoal">Templates</h2>
      {templates.length === 0 ? (
        <p className="t-body animate-fade-up-1 text-neutral-500">
          Nenhum template cadastrado — crie a primeira versão para emitir contratos.
        </p>
      ) : (
        <Card unpadded className="animate-fade-up-1">
          <div className="overflow-x-auto">
            <table className="w-full min-w-xl text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left">
                  <th className="t-eyebrow px-5 py-3.5 text-neutral-400">Versão</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Nome</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Situação</th>
                  <th className="t-eyebrow px-3 py-3.5 text-right text-neutral-400">
                    Contratos
                  </th>
                  <th className="t-eyebrow px-5 py-3.5 text-neutral-400">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td className="t-money px-5 py-3.5">v{t.version}</td>
                    <td className="px-3 py-3.5 font-medium">{t.name}</td>
                    <td className="px-3 py-3.5">
                      {t.active ? (
                        <Badge tone="success">Ativo</Badge>
                      ) : (
                        <Badge tone="neutral">Inativo</Badge>
                      )}
                    </td>
                    <td className="t-money px-3 py-3.5 text-right">{t._count.contracts}</td>
                    <td className="t-caption px-5 py-3.5 text-neutral-400 whitespace-nowrap">
                      {formatDate(t.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {contracts.some((c) => c.status === "PARTNER_SIGNED") && (
        <Card
          tone="outlined"
          className="animate-fade-up-1 mt-8 border-credios-gold/30 bg-credios-gold-50"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-credios-gold/15">
                <PenLine size={20} className="text-credios-gold-700" aria-hidden />
              </span>
              <p className="t-body text-credios-charcoal">
                <strong>
                  {contracts.filter((c) => c.status === "PARTNER_SIGNED").length}
                </strong>{" "}
                contrato(s) aguardando a assinatura da Credios. As cópias finais só
                são enviadas depois da sua assinatura.
              </p>
            </div>
          </div>
        </Card>
      )}

      <h2 className="t-heading animate-fade-up-2 mt-10 mb-4 text-credios-charcoal">
        Contratos emitidos
      </h2>
      {contracts.length === 0 ? (
        <div className="animate-fade-up-2">
          <EmptyState
            icon={FileSignature}
            title="Nenhum contrato emitido"
            description="Os contratos são gerados automaticamente quando o parceiro cria a senha de acesso."
          />
        </div>
      ) : (
        <Card unpadded className="animate-fade-up-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-3xl text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left">
                  <th className="t-eyebrow px-5 py-3.5 text-neutral-400">Parceiro</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Status</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Enviado</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Visualizado</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Assinado</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Verificação</th>
                  <th className="t-eyebrow px-5 py-3.5 text-neutral-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {contracts.map((c) => (
                  <tr key={c.id} className="align-middle">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/parceiros/${c.partner.id}`}
                        className="font-medium text-credios-charcoal transition-colors duration-150 hover:text-credios-blue"
                      >
                        {c.partner.legalName}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5">
                      <ContractStatusBadge status={c.status} />
                    </td>
                    <td className="t-caption px-3 py-3.5 text-neutral-400 whitespace-nowrap">
                      {formatDateTime(c.sentAt)}
                    </td>
                    <td className="t-caption px-3 py-3.5 text-neutral-400 whitespace-nowrap">
                      {formatDateTime(c.viewedAt)}
                    </td>
                    <td className="t-caption px-3 py-3.5 text-neutral-400 whitespace-nowrap">
                      {formatDateTime(c.signedAt)}
                    </td>
                    <td className="px-3 py-3.5 font-mono text-xs whitespace-nowrap">
                      {c.verifyCode}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {c.status === "PARTNER_SIGNED" && (
                          <Link
                            href={`/admin/contratos/${c.id}/assinar`}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-credios-gold px-4 text-sm font-semibold text-credios-charcoal shadow-sm transition-[filter] duration-150 hover:brightness-110"
                          >
                            <PenLine size={14} aria-hidden />
                            Assinar
                          </Link>
                        )}
                        {c.status !== "SIGNED" &&
                          c.status !== "PARTNER_SIGNED" &&
                          c.status !== "CANCELLED" && (
                            <ResendContractButton contractId={c.id} />
                          )}
                        <Link
                          href={`/api/contracts/${c.id}/download`}
                          className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium text-credios-blue transition-colors duration-150 hover:text-credios-blue-700"
                        >
                          <Download size={14} aria-hidden />
                          Baixar
                        </Link>
                      </div>
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
