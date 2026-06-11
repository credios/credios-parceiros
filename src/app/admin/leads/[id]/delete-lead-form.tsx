"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { deleteLeadAction } from "@/lib/actions/admin-leads";
import type { ActionState } from "@/lib/actions/admin-helpers";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Exclusão definitiva — confirmação por texto, à la zona de risco. */
export function DeleteLeadForm({
  leadId,
  hasCommission,
  syncedWithCrm,
}: {
  leadId: string;
  hasCommission: boolean;
  syncedWithCrm: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    deleteLeadAction,
    null
  );
  const [confirm, setConfirm] = useState("");

  if (hasCommission) {
    return (
      <p className="t-caption text-neutral-500">
        Este lead tem comissão vinculada e não pode ser excluído — a trilha
        financeira precisa ser preservada.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="t-caption text-neutral-500">
        Exclusão definitiva: o lead e todo o histórico de status somem do portal
        (o parceiro deixa de vê-lo). Use apenas para testes e cadastros errados.
        {syncedWithCrm &&
          " Este lead também existe no CRM — se for o caso, exclua lá também."}
      </p>
      {state?.error && (
        <div
          className="flex items-start gap-2 rounded-md bg-status-danger-bg px-4 py-3"
          role="alert"
        >
          <AlertCircle
            size={18}
            className="text-status-danger shrink-0 mt-0.5"
            aria-hidden
          />
          <p className="text-sm text-status-danger">{state.error}</p>
        </div>
      )}
      <input type="hidden" name="leadId" value={leadId} />
      <Field
        label='Digite "EXCLUIR" para confirmar'
        htmlFor="confirm-delete"
        className="max-w-xs"
      >
        <Input
          id="confirm-delete"
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.currentTarget.value)}
          autoComplete="off"
          placeholder="EXCLUIR"
        />
      </Field>
      <div>
        <SubmitButton
          variant="danger"
          pendingLabel="Excluindo…"
          disabled={confirm.trim().toUpperCase() !== "EXCLUIR"}
        >
          <Trash2 size={16} aria-hidden />
          Excluir lead definitivamente
        </SubmitButton>
      </div>
    </form>
  );
}
