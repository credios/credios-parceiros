"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { MailPlus, Trash2, UserPlus, X } from "lucide-react";
import {
  createManagerAction,
  resendManagerInviteAction,
  deleteManagerAction,
} from "@/lib/actions/admin-team";
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

/** Form inline de criação de gerente — nome + email, convite por email. */
export function NewManagerForm() {
  const [state, formAction] = useActionState(createManagerAction, null);
  useActionToast(state);
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome completo" htmlFor="manager-name" required error={errors.name}>
          <Input id="manager-name" name="name" autoComplete="off" />
        </Field>
        <Field label="Email" htmlFor="manager-email" required error={errors.email}>
          <Input id="manager-email" name="email" type="email" autoComplete="off" />
        </Field>
      </div>
      <div>
        <SubmitButton pendingLabel="Criando e enviando convite…">
          <UserPlus size={16} aria-hidden />
          Criar gerente e enviar convite
        </SubmitButton>
      </div>
    </form>
  );
}

export function ResendManagerInviteForm({ userId }: { userId: string }) {
  const [state, formAction] = useActionState(resendManagerInviteAction, null);
  useActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <SubmitButton variant="outline" size="sm" className="min-h-11" pendingLabel="Reenviando…">
        <MailPlus size={14} aria-hidden />
        Reenviar convite
      </SubmitButton>
    </form>
  );
}

/** Remoção de gerente com confirmação por texto, à la zona de risco. */
export function DeleteManagerForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [state, formAction] = useActionState(deleteManagerAction, null);
  useActionToast(state, () => setOpen(false));

  if (!open) {
    return (
      <Button variant="danger" size="sm" className="min-h-11" onClick={() => setOpen(true)}>
        <Trash2 size={14} aria-hidden />
        Remover
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex w-56 flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />
      <Field
        label='Digite "REMOVER" para confirmar'
        htmlFor={`confirm-${userId}`}
        required
      >
        <Input
          id={`confirm-${userId}`}
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.currentTarget.value)}
          placeholder="REMOVER"
          autoComplete="off"
        />
      </Field>
      <div className="flex gap-2">
        <SubmitButton
          variant="danger"
          size="sm"
          className="min-h-11"
          disabled={confirm.trim().toUpperCase() !== "REMOVER"}
          pendingLabel="Removendo…"
        >
          Remover gerente
        </SubmitButton>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11"
          onClick={() => setOpen(false)}
        >
          <X size={14} aria-hidden />
          Voltar
        </Button>
      </div>
    </form>
  );
}
