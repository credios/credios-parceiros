"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import type { LeadStatus } from "@prisma/client";
import { updateLeadStatusAction } from "@/lib/actions/admin-leads";
import { STATUS_META, FUNNEL_STEPS } from "@/lib/status";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { maskMoney } from "../../_components/masks";

const ALL_STATUSES: LeadStatus[] = [...FUNNEL_STEPS, "RECUSADO", "CANCELADO"];

function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date()
  );
}

export function LeadStatusForm({
  leadId,
  currentStatus,
}: {
  leadId: string;
  currentStatus: LeadStatus;
}) {
  const [state, formAction] = useActionState(updateLeadStatusAction, null);
  const [status, setStatus] = useState<LeadStatus>(currentStatus);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!state) return;
    if (state.ok && state.message) toast.success(state.message);
    else if (state.error) toast.error(state.error);
  }, [state]);

  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="leadId" value={leadId} />

      <Field label="Novo status" htmlFor="status" required error={errors.status}>
        <Select
          id="status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus)}
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
      </Field>

      {status === "LIBERADO" && (
        <div className="flex flex-col gap-5 rounded-md border border-credios-gold/30 bg-credios-gold-50 p-4">
          <p className="t-caption text-credios-gold-900">
            Marcar como liberado gera a comissão do parceiro automaticamente, com a taxa
            atual congelada.
          </p>
          <Field
            label="Valor líquido liberado ao cliente (R$)"
            hint="Base da comissão: o que caiu na conta do cliente, já descontados tributos, tarifas e demais custos retidos."
            htmlFor="disbursedAmount"
            required
            error={errors.disbursedAmount}
          >
            <Input
              id="disbursedAmount"
              name="disbursedAmount"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(maskMoney(e.target.value))}
              placeholder="500.000,00"
            />
          </Field>
          <Field
            label="Data da liberação"
            htmlFor="disbursedAt"
            required
            error={errors.disbursedAt}
          >
            <Input
              id="disbursedAt"
              name="disbursedAt"
              type="date"
              required
              defaultValue={todayISO()}
            />
          </Field>
        </div>
      )}

      <Field label="Nota (opcional)" htmlFor="note" error={errors.note}>
        <Textarea
          id="note"
          name="note"
          rows={2}
          placeholder="Contexto da mudança — fica registrado no histórico."
        />
      </Field>

      {state?.ok && state.message && (
        <p className="rounded-md bg-status-success-bg px-3 py-2 text-sm text-status-success">
          {state.message}
        </p>
      )}

      <SubmitButton pendingLabel="Atualizando…">Atualizar status</SubmitButton>
    </form>
  );
}
