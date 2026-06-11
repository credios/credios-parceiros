import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Info } from "lucide-react";
import { requirePartnerSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_META } from "@/lib/status";
import { formatBRL, formatDateTime, maskDocument } from "@/lib/format";
import { PRODUCTS } from "@/lib/credios";
import { Card } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/ui/badge";
import { Timeline } from "@/components/timeline";

export const metadata = { title: "Acompanhar operação" };

export default async function ClienteDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nova?: string; ja?: string }>;
}) {
  const { partnerId } = await requirePartnerSession();
  const [{ id }, query] = await Promise.all([params, searchParams]);

  // Ownership: o lead precisa pertencer ao parceiro da sessão.
  const lead = await prisma.lead.findFirst({
    where: { id, partnerId },
    include: {
      statusHistory: { orderBy: { createdAt: "asc" } },
      commission: true,
    },
  });
  if (!lead) notFound();

  const product = PRODUCTS.find((p) => p.value === lead.product)?.label ?? lead.product;
  const banner =
    query.nova === "1"
      ? {
          icon: CheckCircle2,
          text: "Indicação recebida! Nossa equipe entra em contato com o cliente em até 1 dia útil.",
        }
      : query.ja === "1"
        ? {
            icon: Info,
            text: "Você já tinha indicado este cliente — acompanhe por aqui.",
          }
        : null;

  return (
    <div className="max-w-3xl">
      {banner && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-md bg-status-success-bg px-4 py-3 mb-6"
        >
          <banner.icon size={18} className="text-status-success shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-status-success">{banner.text}</p>
        </div>
      )}

      {/* Momento de ouro: crédito liberado */}
      {lead.status === "LIBERADO" && (
        <Card tone="dark" className="border-credios-gold/40 shadow-glow-gold mb-6">
          <p className="t-eyebrow text-credios-gold-300">Crédito liberado 🎉</p>
          <p className="t-money text-4xl sm:text-5xl text-white mt-2">
            {formatBRL(lead.disbursedAmount)}
          </p>
          {lead.commission && (
            <p className="t-body text-white/80 mt-3">
              Sua comissão:{" "}
              <span className="t-money text-credios-gold-300">
                {formatBRL(lead.commission.amount)}
              </span>
            </p>
          )}
          <Link
            href="/app/comissoes"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-credios-gold-300 transition-colors duration-150 hover:text-credios-gold-100"
          >
            Ver minhas comissões
            <ArrowRight size={16} aria-hidden />
          </Link>
        </Card>
      )}

      {/* Header do cliente */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="t-display-md text-credios-charcoal">{lead.name}</h1>
          <LeadStatusBadge status={lead.status} />
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
          <div>
            <dt className="t-caption text-neutral-400">Produto</dt>
            <dd className="text-sm font-medium text-credios-charcoal">{product}</dd>
          </div>
          <div>
            <dt className="t-caption text-neutral-400">Valor desejado</dt>
            <dd className="text-sm font-medium t-money text-credios-charcoal">
              {formatBRL(lead.requestedAmount)}
            </dd>
          </div>
          <div>
            <dt className="t-caption text-neutral-400">Documento</dt>
            <dd className="text-sm font-medium text-credios-charcoal">
              {maskDocument(lead.document)}
            </dd>
          </div>
          <div>
            <dt className="t-caption text-neutral-400">Cidade</dt>
            <dd className="text-sm font-medium text-credios-charcoal">
              {lead.city ? `${lead.city}${lead.state ? `/${lead.state}` : ""}` : "—"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Timeline — elemento-assinatura */}
      <Card tone="white" className="mb-6">
        <h2 className="t-eyebrow text-neutral-500 mb-6">Andamento da operação</h2>
        <Timeline lead={lead} events={lead.statusHistory} />
      </Card>

      {/* Histórico real de movimentações */}
      <Card>
        <h2 className="t-eyebrow text-neutral-500 mb-4">Histórico</h2>
        <ul className="divide-y divide-black/5">
          {[...lead.statusHistory].reverse().map((event) => (
            <li key={event.id} className="flex items-baseline justify-between gap-4 py-2.5">
              <p className="text-sm text-credios-charcoal">
                {event.from
                  ? `${STATUS_META[event.from].label} → ${STATUS_META[event.to].label}`
                  : STATUS_META[event.to].label}
              </p>
              <p className="t-caption text-neutral-400 shrink-0">
                {formatDateTime(event.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
