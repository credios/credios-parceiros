"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  updateProfileAction,
  changePasswordAction,
  type ActionState,
} from "@/lib/actions/partner";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Máscara de telefone (00) 0000-0000 / (00) 00000-0000. */
function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/^(\(\d{2}\) \d{4})(\d)/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/^(\(\d{2}\) \d{5})(\d)/, "$1-$2");
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md bg-status-danger-bg px-4 py-3"
    >
      <AlertCircle size={18} className="text-status-danger shrink-0 mt-0.5" aria-hidden />
      <p className="text-sm text-status-danger">{message}</p>
    </div>
  );
}

/** Telefone + dados de recebimento (PIX e conta bancária). */
export function ProfileForm({
  defaults,
}: {
  defaults: {
    phone: string;
    pixKey: string;
    bankName: string;
    bankAgency: string;
    bankAccount: string;
  };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateProfileAction,
    null
  );
  const [phone, setPhone] = useState(maskPhone(defaults.phone));
  const errors = state?.fieldErrors ?? {};

  useEffect(() => {
    if (state?.ok) toast.success("Dados salvos");
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormError message={state?.error} />
      <Field label="Telefone" htmlFor="phone" required error={errors.phone}>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(maskPhone(e.target.value))}
          placeholder="(00) 00000-0000"
        />
      </Field>

      <div className="border-t border-black/5 pt-5 mt-3">
        <h3 className="t-eyebrow text-credios-blue-700 mb-5">Recebimento</h3>
        <div className="flex flex-col gap-5">
          <Field
            label="Chave PIX"
            htmlFor="pixKey"
            error={errors.pixKey}
            hint="CPF/CNPJ, email, telefone ou chave aleatória"
          >
            <Input
              id="pixKey"
              name="pixKey"
              defaultValue={defaults.pixKey}
              autoComplete="off"
              placeholder="Sua chave PIX"
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Banco" htmlFor="bankName" error={errors.bankName}>
              <Input
                id="bankName"
                name="bankName"
                defaultValue={defaults.bankName}
                autoComplete="off"
                placeholder="Banco"
              />
            </Field>
            <Field label="Agência" htmlFor="bankAgency" error={errors.bankAgency}>
              <Input
                id="bankAgency"
                name="bankAgency"
                defaultValue={defaults.bankAgency}
                autoComplete="off"
                inputMode="numeric"
                placeholder="0000"
              />
            </Field>
            <Field label="Conta" htmlFor="bankAccount" error={errors.bankAccount}>
              <Input
                id="bankAccount"
                name="bankAccount"
                defaultValue={defaults.bankAccount}
                autoComplete="off"
                inputMode="numeric"
                placeholder="00000-0"
              />
            </Field>
          </div>
        </div>
      </div>

      <div>
        <SubmitButton pendingLabel="Salvando...">Salvar dados</SubmitButton>
      </div>
    </form>
  );
}

/** Troca de senha (exige a senha atual). */
export function PasswordForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    changePasswordAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state?.fieldErrors ?? {};

  useEffect(() => {
    if (state?.ok) {
      toast.success("Senha alterada");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Card tone="white">
      <h2 className="t-eyebrow text-credios-blue-700 pb-3 border-b border-black/5 mb-5">
        Senha
      </h2>
      <form ref={formRef} action={formAction} className="flex flex-col gap-5">
        <FormError message={state?.error} />
        <Field
          label="Senha atual"
          htmlFor="currentPassword"
          required
          error={errors.currentPassword}
        >
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Nova senha"
            htmlFor="password"
            required
            error={errors.password}
            hint="Pelo menos 10 caracteres"
          >
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
            />
          </Field>
          <Field
            label="Confirmar nova senha"
            htmlFor="confirmPassword"
            required
            error={errors.confirmPassword}
          >
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
            />
          </Field>
        </div>
        <div>
          <SubmitButton pendingLabel="Alterando...">Alterar senha</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
