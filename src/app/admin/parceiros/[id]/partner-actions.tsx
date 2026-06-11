"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { MailPlus, Pause, Play, Pencil, X } from "lucide-react";
import {
  resendInviteAction,
  suspendPartnerAction,
  reactivatePartnerAction,
  updatePartnerRateAction,
  updatePartnerAction,
} from "@/lib/actions/admin-partners";
import type { ActionState } from "@/lib/actions/admin-helpers";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { maskCpfCnpj, maskPhone, maskRate } from "../../_components/masks";

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

export function ResendInviteForm({ partnerId }: { partnerId: string }) {
  const [state, formAction] = useActionState(resendInviteAction, null);
  useActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="partnerId" value={partnerId} />
      <SubmitButton variant="outline" pendingLabel="Reenviando…">
        <MailPlus size={16} aria-hidden />
        Reenviar convite
      </SubmitButton>
    </form>
  );
}

export function SuspendPartnerForm({ partnerId }: { partnerId: string }) {
  const [state, formAction] = useActionState(suspendPartnerAction, null);
  useActionToast(state);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Suspender este parceiro? O acesso ao portal será bloqueado.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="partnerId" value={partnerId} />
      <SubmitButton variant="danger" pendingLabel="Suspendendo…">
        <Pause size={16} aria-hidden />
        Suspender
      </SubmitButton>
    </form>
  );
}

export function ReactivatePartnerForm({ partnerId }: { partnerId: string }) {
  const [state, formAction] = useActionState(reactivatePartnerAction, null);
  useActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="partnerId" value={partnerId} />
      <SubmitButton variant="outline" pendingLabel="Reativando…">
        <Play size={16} aria-hidden />
        Reativar
      </SubmitButton>
    </form>
  );
}

export function RateForm({
  partnerId,
  currentRate,
}: {
  partnerId: string;
  currentRate: string;
}) {
  const [state, formAction] = useActionState(updatePartnerRateAction, null);
  const [rate, setRate] = useState(currentRate);
  useActionToast(state);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="partnerId" value={partnerId} />
      <Field
        label="Taxa de comissão (%)"
        htmlFor="commissionRate"
        error={state?.fieldErrors?.commissionRate}
        hint="Comissões já geradas não são recalculadas."
      >
        <div className="flex gap-2">
          <Input
            id="commissionRate"
            name="commissionRate"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(maskRate(e.target.value))}
            className="max-w-24"
          />
          <SubmitButton variant="outline" pendingLabel="Salvando…">
            Salvar taxa
          </SubmitButton>
        </div>
      </Field>
    </form>
  );
}

export function EditPartnerForm({
  partnerId,
  defaults,
}: {
  partnerId: string;
  defaults: {
    legalName: string;
    document: string;
    email: string;
    phone: string;
    notes: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [document, setDocument] = useState(maskCpfCnpj(defaults.document));
  const [phone, setPhone] = useState(maskPhone(defaults.phone));
  const [state, formAction] = useActionState(updatePartnerAction, null);
  useActionToast(state, () => setOpen(false));

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Pencil size={16} aria-hidden />
        Editar dados cadastrais
      </Button>
    );
  }

  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="partnerId" value={partnerId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Nome / razão social"
          htmlFor="edit-legalName"
          required
          error={errors.legalName}
        >
          <Input id="edit-legalName" name="legalName" defaultValue={defaults.legalName} />
        </Field>
        <Field label="CPF/CNPJ" htmlFor="edit-document" required error={errors.document}>
          <Input
            id="edit-document"
            name="document"
            inputMode="numeric"
            value={document}
            onChange={(e) => setDocument(maskCpfCnpj(e.target.value))}
          />
        </Field>
        <Field label="Email" htmlFor="edit-email" required error={errors.email}>
          <Input id="edit-email" name="email" type="email" defaultValue={defaults.email} />
        </Field>
        <Field label="Telefone" htmlFor="edit-phone" required error={errors.phone}>
          <Input
            id="edit-phone"
            name="phone"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
          />
        </Field>
      </div>
      <Field
        label="Notas internas"
        htmlFor="edit-notes"
        error={errors.notes}
        hint="Visível apenas para o time Credios."
      >
        <Textarea id="edit-notes" name="notes" rows={3} defaultValue={defaults.notes} />
      </Field>
      <div className="flex gap-2">
        <SubmitButton pendingLabel="Salvando…">Salvar alterações</SubmitButton>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          <X size={16} aria-hidden />
          Cancelar
        </Button>
      </div>
    </form>
  );
}
