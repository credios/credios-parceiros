import { Check, X } from "lucide-react";
import type { Lead, LeadStatusEvent, LeadStatus } from "@prisma/client";
import { cn } from "@/lib/cn";
import { STATUS_META, FUNNEL_STEPS } from "@/lib/status";
import { formatDate } from "@/lib/format";

type StepState = "done" | "current" | "future";

/** Primeiro evento cuja transição chegou na etapa — data real do marco. */
function dateOf(events: LeadStatusEvent[], step: LeadStatus): Date | null {
  const event = events.find((e) => e.to === step);
  return event?.createdAt ?? null;
}

/**
 * Linha do tempo da operação — o elemento-assinatura do produto.
 * Etapas concluídas em azul com data real, etapa atual destacada com
 * microcópia e prazo típico, etapas futuras esmaecidas. Encerramentos
 * negativos viram um nó terminal respeitoso, sem expor motivos internos.
 */
export function Timeline({ lead, events }: { lead: Lead; events: LeadStatusEvent[] }) {
  const negative =
    lead.status === "RECUSADO" ||
    lead.status === "CANCELADO" ||
    lead.status === "EXCLUIDO";
  const released = lead.status === "LIBERADO";

  // Última etapa do funil efetivamente alcançada (para encerramentos negativos).
  const reachedIndex = negative
    ? Math.max(
        0,
        ...events
          .map((e) => FUNNEL_STEPS.indexOf(e.to))
          .filter((i) => i >= 0)
      )
    : FUNNEL_STEPS.indexOf(lead.status);

  const steps = negative ? FUNNEL_STEPS.slice(0, reachedIndex + 1) : FUNNEL_STEPS;
  const terminalDate = negative ? dateOf(events, lead.status) : null;

  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const meta = STATUS_META[step];
        const state: StepState = negative
          ? "done"
          : released
            ? "done"
            : i < reachedIndex
              ? "done"
              : i === reachedIndex
                ? "current"
                : "future";
        const isLast = !negative && i === steps.length - 1;
        const date = dateOf(events, step);
        // Destaque da etapa final: LIBERADO concluído é o momento de ouro.
        const goldFinale = released && step === "LIBERADO";
        const highlighted = state === "current" || goldFinale;
        // Conector da última etapa concluída para a atual: azul desvanecendo.
        const connectsToCurrent =
          !negative && !released && state === "done" && i + 1 === reachedIndex;

        return (
          <li key={step} className="relative flex gap-4 pb-10 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-4 top-9 bottom-0 w-px -translate-x-1/2",
                  state === "done" && !goldFinale
                    ? connectsToCurrent
                      ? "bg-gradient-to-b from-credios-blue to-neutral-200"
                      : "bg-credios-blue"
                    : "bg-neutral-200"
                )}
              />
            )}

            {/* Nó */}
            {state === "done" ? (
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  goldFinale ? "bg-credios-gold shadow-glow-gold" : "bg-credios-blue"
                )}
              >
                <Check
                  size={16}
                  className={goldFinale ? "text-credios-charcoal" : "text-white"}
                  aria-hidden
                />
              </span>
            ) : state === "current" ? (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white border-2 border-credios-blue shadow-glow-blue animate-pulse-soft">
                <span className="size-2.5 rounded-full bg-credios-blue" aria-hidden />
              </span>
            ) : (
              <span className="size-8 shrink-0 rounded-full bg-white border-2 border-neutral-200" />
            )}

            {/* Conteúdo */}
            <div className={cn("min-w-0 pt-1", highlighted ? "pt-0.5" : undefined)}>
              <p
                className={cn(
                  highlighted
                    ? "t-heading text-credios-charcoal"
                    : state === "done"
                      ? "text-sm font-semibold text-credios-charcoal"
                      : "text-sm font-medium text-neutral-400"
                )}
              >
                {meta.label}
              </p>
              {state === "done" && date && (
                <p className="t-caption text-neutral-400 mt-0.5">{formatDate(date)}</p>
              )}
              {highlighted && (
                <>
                  <p className="t-body text-neutral-600 mt-1.5 max-w-xl">
                    {meta.description}
                  </p>
                  {state === "current" && meta.typicalTime && (
                    <p className="t-caption text-neutral-500 mt-1.5">
                      Prazo típico: {meta.typicalTime}
                    </p>
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}

      {/* Nó terminal de encerramento negativo */}
      {negative && (
        <li className="relative flex gap-4">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              lead.status === "RECUSADO" ? "bg-status-danger" : "bg-neutral-400"
            )}
          >
            <X size={16} className="text-white" aria-hidden />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="t-heading text-credios-charcoal">
              {STATUS_META[lead.status].label}
            </p>
            {terminalDate && (
              <p className="t-caption text-neutral-500 mt-0.5">
                {formatDate(terminalDate)}
              </p>
            )}
            <p className="t-body text-neutral-600 mt-1.5 max-w-xl">
              {STATUS_META[lead.status].description}
            </p>
          </div>
        </li>
      )}
    </ol>
  );
}
