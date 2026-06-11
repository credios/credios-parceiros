import Link from "next/link";
import type { Metadata } from "next";
import { Plug, Info } from "lucide-react";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/cn";
import { formatDateTime, timeAgo } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ReprocessSyncButton, ReprocessAllButton } from "../_components/sync-buttons";

export const metadata: Metadata = { title: "Integrações" };

const DAY_MS = 24 * 60 * 60_000;

function oneDayAgo(): Date {
  return new Date(Date.now() - DAY_MS);
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default async function AdminIntegrationsPage() {
  await requireAdminSession();

  const dayAgo = oneDayAgo();

  const [lastInbound, pendingCount, failedCount, inboundErrors24h, queue, logs] =
    await Promise.all([
      prisma.integrationLog.findFirst({
        where: { direction: "INBOUND" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, success: true },
      }),
      prisma.lead.count({ where: { crmSyncStatus: "PENDING" } }),
      prisma.lead.count({ where: { crmSyncStatus: "FAILED" } }),
      prisma.integrationLog.count({
        where: { direction: "INBOUND", success: false, createdAt: { gte: dayAgo } },
      }),
      prisma.lead.findMany({
        where: { crmSyncStatus: { in: ["FAILED", "PENDING"] } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          crmSyncStatus: true,
          createdAt: true,
          partner: { select: { id: true, legalName: true } },
        },
      }),
      prisma.integrationLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

  return (
    <div>
      <PageHeader
        title="Integrações"
        description="Saúde da ponte entre o portal e o CRM."
      />

      <div className="mb-6 flex items-start gap-2 rounded-md bg-status-info-bg px-4 py-3">
        <Info size={16} className="mt-0.5 shrink-0 text-status-info" aria-hidden />
        <p className="text-sm text-status-info">
          O portal funciona de ponta a ponta sem o CRM conectado — atualize status
          manualmente em{" "}
          <Link href="/admin/leads" className="font-semibold underline">
            Leads
          </Link>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="t-eyebrow text-neutral-500">Último webhook recebido</p>
          {lastInbound ? (
            <>
              <p className="mt-2 text-lg font-semibold text-credios-charcoal">
                {formatDateTime(lastInbound.createdAt)}
              </p>
              <div className="mt-1.5">
                {lastInbound.success ? (
                  <Badge tone="success">Sucesso</Badge>
                ) : (
                  <Badge tone="danger">Erro</Badge>
                )}
              </div>
            </>
          ) : (
            <p className="mt-2 text-lg font-semibold text-neutral-400">Nunca</p>
          )}
        </Card>
        <Card>
          <p className="t-eyebrow text-neutral-500">Aguardando sync</p>
          <p className="t-money mt-2 text-3xl text-status-warning">{pendingCount}</p>
        </Card>
        <Card>
          <p className="t-eyebrow text-neutral-500">Falhas de sync</p>
          <p className="t-money mt-2 text-3xl text-status-danger">{failedCount}</p>
        </Card>
        <Card>
          <p className="t-eyebrow text-neutral-500">Webhooks com erro (24h)</p>
          <p
            className={cn(
              "t-money mt-2 text-3xl",
              inboundErrors24h > 0 ? "text-status-danger" : "text-credios-charcoal"
            )}
          >
            {inboundErrors24h}
          </p>
        </Card>
      </div>

      <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="t-heading text-credios-charcoal">Fila de reprocessamento</h2>
        {queue.length > 0 && <ReprocessAllButton />}
      </div>
      {queue.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="Fila vazia"
          description="Todos os leads estão sincronizados com o CRM."
        />
      ) : (
        <Card unpadded>
          <div className="overflow-x-auto">
            <table className="w-full min-w-2xl text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-neutral-500">
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Parceiro</th>
                  <th className="px-3 py-3 font-medium">Situação</th>
                  <th className="px-3 py-3 font-medium">Criado</th>
                  <th className="px-5 py-3 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((lead) => (
                  <tr key={lead.id} className="border-b border-neutral-100 last:border-b-0">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="font-medium text-credios-charcoal transition-colors duration-150 hover:text-credios-blue"
                      >
                        {lead.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-neutral-600">
                      {lead.partner.legalName}
                    </td>
                    <td className="px-3 py-3">
                      {lead.crmSyncStatus === "FAILED" ? (
                        <Badge tone="danger">Falha</Badge>
                      ) : (
                        <Badge tone="warning">Pendente</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-neutral-500 whitespace-nowrap">
                      {timeAgo(lead.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <ReprocessSyncButton leadId={lead.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <h2 className="t-heading mt-10 mb-4 text-credios-charcoal">Log de integração</h2>
      {logs.length === 0 ? (
        <p className="t-body text-neutral-500">Nenhuma entrada de log ainda.</p>
      ) : (
        <Card unpadded>
          <ul className="divide-y divide-neutral-100">
            {logs.map((log) => (
              <li key={log.id}>
                <details className="group px-5 py-3 sm:px-6">
                  <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 list-none">
                    <Badge tone={log.direction === "INBOUND" ? "info" : "neutral"}>
                      {log.direction === "INBOUND" ? "CRM → portal" : "Portal → CRM"}
                    </Badge>
                    {log.success ? (
                      <Badge tone="success">ok</Badge>
                    ) : (
                      <Badge tone="danger">erro</Badge>
                    )}
                    <span className="font-mono text-xs text-neutral-600">
                      {log.endpoint}
                    </span>
                    {log.error && (
                      <span className="max-w-xs truncate text-xs text-status-danger">
                        {log.error}
                      </span>
                    )}
                    <span className="t-caption ml-auto text-neutral-400">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </summary>
                  <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div>
                      <p className="t-caption mb-1 text-neutral-500">Payload</p>
                      <pre className="max-h-64 overflow-auto rounded-md bg-neutral-50 p-3 font-mono text-xs text-neutral-700">
                        {prettyJson(log.payload)}
                      </pre>
                    </div>
                    <div>
                      <p className="t-caption mb-1 text-neutral-500">
                        Resposta{log.retries > 0 ? ` (retries: ${log.retries})` : ""}
                      </p>
                      <pre className="max-h-64 overflow-auto rounded-md bg-neutral-50 p-3 font-mono text-xs text-neutral-700">
                        {log.response ? prettyJson(log.response) : "—"}
                      </pre>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
