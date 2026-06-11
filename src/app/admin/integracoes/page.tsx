import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Plug,
  Info,
  Webhook,
  Clock,
  TriangleAlert,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
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
  // Integração com o CRM é assunto do configurador.
  const { isMaster } = await requireAdminSession();
  if (!isMaster) redirect("/admin");

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
      <div className="animate-fade-up">
        <PageHeader
          title="Integrações"
          description="Saúde da ponte entre o portal e o CRM."
        />
      </div>

      <div className="animate-fade-up-1 mb-6 flex items-start gap-2 rounded-md bg-status-info-bg px-4 py-3">
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

      <div className="animate-fade-up-1 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-center gap-2">
            <Webhook
              size={16}
              className={cn(
                lastInbound
                  ? lastInbound.success
                    ? "text-status-success"
                    : "text-status-danger"
                  : "text-neutral-400"
              )}
              aria-hidden
            />
            <p className="t-eyebrow text-neutral-500">Último webhook recebido</p>
          </div>
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
          <div className="flex items-center gap-2">
            <Clock
              size={16}
              className={pendingCount > 0 ? "text-status-warning" : "text-status-success"}
              aria-hidden
            />
            <p className="t-eyebrow text-neutral-500">Aguardando sync</p>
          </div>
          <p
            className={cn(
              "t-money mt-2 text-3xl",
              pendingCount > 0 ? "text-status-warning" : "text-credios-charcoal"
            )}
          >
            {pendingCount}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <TriangleAlert
              size={16}
              className={failedCount > 0 ? "text-status-danger" : "text-status-success"}
              aria-hidden
            />
            <p className="t-eyebrow text-neutral-500">Falhas de sync</p>
          </div>
          <p
            className={cn(
              "t-money mt-2 text-3xl",
              failedCount > 0 ? "text-status-danger" : "text-credios-charcoal"
            )}
          >
            {failedCount}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <ShieldAlert
              size={16}
              className={
                inboundErrors24h > 0 ? "text-status-danger" : "text-status-success"
              }
              aria-hidden
            />
            <p className="t-eyebrow text-neutral-500">Webhooks com erro (24h)</p>
          </div>
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

      <div className="animate-fade-up-2 mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="t-heading text-credios-charcoal">Fila de reprocessamento</h2>
        {queue.length > 0 && <ReprocessAllButton />}
      </div>
      {queue.length === 0 ? (
        <div className="animate-fade-up-2">
          <EmptyState
            icon={Plug}
            title="Fila vazia"
            description="Todos os leads estão sincronizados com o CRM."
          />
        </div>
      ) : (
        <Card unpadded className="animate-fade-up-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-2xl text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left">
                  <th className="t-eyebrow px-5 py-3.5 text-neutral-400">Cliente</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Parceiro</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Situação</th>
                  <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Criado</th>
                  <th className="t-eyebrow px-5 py-3.5 text-neutral-400">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {queue.map((lead) => (
                  <tr key={lead.id}>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="font-medium text-credios-charcoal transition-colors duration-150 hover:text-credios-blue"
                      >
                        {lead.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 text-neutral-600">
                      {lead.partner.legalName}
                    </td>
                    <td className="px-3 py-3.5">
                      {lead.crmSyncStatus === "FAILED" ? (
                        <Badge tone="danger">Falha</Badge>
                      ) : (
                        <Badge tone="warning">Pendente</Badge>
                      )}
                    </td>
                    <td className="t-caption px-3 py-3.5 text-neutral-400 whitespace-nowrap">
                      {timeAgo(lead.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <ReprocessSyncButton leadId={lead.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <h2 className="t-heading animate-fade-up-2 mt-10 mb-4 text-credios-charcoal">
        Log de integração
      </h2>
      {logs.length === 0 ? (
        <p className="t-body animate-fade-up-2 text-neutral-500">
          Nenhuma entrada de log ainda.
        </p>
      ) : (
        <Card unpadded className="animate-fade-up-2">
          <ul className="divide-y divide-black/5">
            {logs.map((log) => (
              <li key={log.id}>
                <details className="group">
                  <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 list-none px-5 py-3 transition-colors duration-150 hover:bg-neutral-50 sm:px-6">
                    <ChevronDown
                      size={15}
                      className="shrink-0 text-neutral-400 transition-transform duration-300 ease-out group-open:rotate-180"
                      aria-hidden
                    />
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
                  <div className="grid grid-cols-1 gap-3 px-5 pt-1 pb-4 sm:px-6 lg:grid-cols-2">
                    <div>
                      <p className="t-eyebrow mb-1.5 text-neutral-400">Payload</p>
                      <pre className="max-h-64 overflow-auto rounded-md bg-credios-charcoal p-4 font-mono text-xs leading-relaxed text-neutral-100">
                        {prettyJson(log.payload)}
                      </pre>
                    </div>
                    <div>
                      <p className="t-eyebrow mb-1.5 text-neutral-400">
                        Resposta{log.retries > 0 ? ` (retries: ${log.retries})` : ""}
                      </p>
                      <pre className="max-h-64 overflow-auto rounded-md bg-credios-charcoal p-4 font-mono text-xs leading-relaxed text-neutral-100">
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
