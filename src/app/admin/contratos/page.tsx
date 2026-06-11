import Link from "next/link";
import type { Metadata } from "next";
import { FileSignature, Plus, Download } from "lucide-react";
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

      <h2 className="t-heading mb-4 text-credios-charcoal">Templates</h2>
      {templates.length === 0 ? (
        <p className="t-body text-neutral-500">
          Nenhum template cadastrado — crie a primeira versão para emitir contratos.
        </p>
      ) : (
        <Card unpadded>
          <div className="overflow-x-auto">
            <table className="w-full min-w-xl text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-neutral-500">
                  <th className="px-5 py-3 font-medium">Versão</th>
                  <th className="px-3 py-3 font-medium">Nome</th>
                  <th className="px-3 py-3 font-medium">Situação</th>
                  <th className="px-3 py-3 font-medium text-right">Contratos</th>
                  <th className="px-5 py-3 font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-neutral-100 last:border-b-0">
                    <td className="t-money px-5 py-3">v{t.version}</td>
                    <td className="px-3 py-3 font-medium">{t.name}</td>
                    <td className="px-3 py-3">
                      {t.active ? (
                        <Badge tone="success">Ativo</Badge>
                      ) : (
                        <Badge tone="neutral">Inativo</Badge>
                      )}
                    </td>
                    <td className="t-money px-3 py-3 text-right">{t._count.contracts}</td>
                    <td className="px-5 py-3 text-neutral-500 whitespace-nowrap">
                      {formatDate(t.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <h2 className="t-heading mt-10 mb-4 text-credios-charcoal">Contratos emitidos</h2>
      {contracts.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="Nenhum contrato emitido"
          description="Os contratos são gerados automaticamente quando o parceiro cria a senha de acesso."
        />
      ) : (
        <Card unpadded>
          <div className="overflow-x-auto">
            <table className="w-full min-w-3xl text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-neutral-500">
                  <th className="px-5 py-3 font-medium">Parceiro</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Enviado</th>
                  <th className="px-3 py-3 font-medium">Visualizado</th>
                  <th className="px-3 py-3 font-medium">Assinado</th>
                  <th className="px-3 py-3 font-medium">Verificação</th>
                  <th className="px-5 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-neutral-100 align-middle last:border-b-0"
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
                      <ContractStatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-3 text-neutral-500 whitespace-nowrap">
                      {formatDateTime(c.sentAt)}
                    </td>
                    <td className="px-3 py-3 text-neutral-500 whitespace-nowrap">
                      {formatDateTime(c.viewedAt)}
                    </td>
                    <td className="px-3 py-3 text-neutral-500 whitespace-nowrap">
                      {formatDateTime(c.signedAt)}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">
                      {c.verifyCode}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {c.status !== "SIGNED" && c.status !== "CANCELLED" && (
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
