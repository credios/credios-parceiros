"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, CheckCheck, X } from "lucide-react";
import {
  markCommissionPaidAction,
  cancelCommissionAction,
} from "@/lib/actions/admin-commissions";
import type { ActionState } from "@/lib/actions/admin-helpers";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input } from "@/components/ui/field";

function useActionToast(state: ActionState, onSuccess?: () => void) {
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      onSuccess?.();
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date()
  );
}

export function CopyPixButton({ pixKey }: { pixKey: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(pixKey);
        toast.success("Chave PIX copiada.");
      }}
      title="Copiar chave PIX"
      className="inline-flex min-h-11 max-w-48 items-center gap-1.5 rounded-md px-2 text-sm text-neutral-600 transition-colors duration-150 hover:bg-credios-blue-50 hover:text-credios-blue cursor-pointer"
    >
      <span className="truncate">{pixKey}</span>
      <Copy size={14} className="shrink-0" aria-hidden />
    </button>
  );
}

export function MarkPaidForm({ commissionId }: { commissionId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(markCommissionPaidAction, null);
  useActionToast(state, () => setOpen(false));

  if (!open) {
    return (
      <Button variant="primary" size="sm" className="min-h-11" onClick={() => setOpen(true)}>
        <CheckCheck size={15} aria-hidden />
        Marcar como paga
      </Button>
    );
  }

  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex w-64 flex-col gap-3">
      <input type="hidden" name="commissionId" value={commissionId} />
      <Field
        label="Data do pagamento"
        htmlFor={`paidAt-${commissionId}`}
        required
        error={errors.paidAt}
      >
        <Input
          id={`paidAt-${commissionId}`}
          name="paidAt"
          type="date"
          required
          defaultValue={todayISO()}
        />
      </Field>
      <Field
        label="Comprovante (PDF, JPG ou PNG, até 5MB)"
        htmlFor={`proof-${commissionId}`}
        required
        error={errors.proof}
      >
        <input
          id={`proof-${commissionId}`}
          name="proof"
          type="file"
          required
          accept="application/pdf,image/jpeg,image/png"
          className="block w-full text-sm text-neutral-600 file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-full file:border-0 file:bg-credios-blue-50 file:px-4 file:text-sm file:font-medium file:text-credios-blue"
        />
      </Field>
      <div className="flex gap-2">
        <SubmitButton size="sm" className="min-h-11" pendingLabel="Confirmando…">
          Confirmar pagamento
        </SubmitButton>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11"
          onClick={() => setOpen(false)}
        >
          <X size={15} aria-hidden />
          Fechar
        </Button>
      </div>
    </form>
  );
}

export function CancelCommissionForm({ commissionId }: { commissionId: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [state, formAction] = useActionState(cancelCommissionAction, null);
  useActionToast(state, () => setOpen(false));

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setOpen(true)}>
        Cancelar comissão
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex w-64 flex-col gap-3">
      <input type="hidden" name="commissionId" value={commissionId} />
      <Field
        label='Digite "CANCELAR" para confirmar'
        htmlFor={`confirm-${commissionId}`}
        required
        error={state?.fieldErrors?.confirmText}
      >
        <Input
          id={`confirm-${commissionId}`}
          name="confirmText"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="CANCELAR"
          autoComplete="off"
        />
      </Field>
      <div className="flex gap-2">
        <SubmitButton
          variant="danger"
          size="sm"
          className="min-h-11"
          disabled={confirmText.trim().toUpperCase() !== "CANCELAR"}
          pendingLabel="Cancelando…"
        >
          Cancelar comissão
        </SubmitButton>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11"
          onClick={() => setOpen(false)}
        >
          Voltar
        </Button>
      </div>
    </form>
  );
}
