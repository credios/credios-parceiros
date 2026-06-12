"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { deletePartnerAction } from "@/lib/actions/admin-partners";
import type { ActionState } from "@/lib/actions/admin-helpers";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Exclusão definitiva do parceiro — master only, confirmação por texto. */
export function DeletePartnerForm({
  partnerId,
  hasCommissions,
  leadCount,
}: {
  partnerId: string;
  hasCommissions: boolean;
  leadCount: number;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    deletePartnerAction,
    null
  );
  const [confirm, setConfirm] = useState("");

  if (hasCommissions) {
    return (
      <p className="t-caption text-neutral-500">
        Este parceiro tem comissões registradas e não pode ser excluído — a
        trilha financeira precisa ser preservada. Use a suspensão para bloquear
        o acesso.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="t-caption text-neutral-500">
        Exclusão definitiva: o parceiro, o acesso dele, o contrato
        {leadCount > 0 && ` e ${leadCount} lead(s)`} somem do portal — e o email
        fica livre para um novo cadastro (inclusive como gerente). Use apenas
        para cadastros errados e testes.
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
      <input type="hidden" name="partnerId" value={partnerId} />
      <Field
        label='Digite "EXCLUIR" para confirmar'
        htmlFor="confirm-delete-partner"
        className="max-w-xs"
      >
        <Input
          id="confirm-delete-partner"
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
          Excluir parceiro definitivamente
        </SubmitButton>
      </div>
    </form>
  );
}
