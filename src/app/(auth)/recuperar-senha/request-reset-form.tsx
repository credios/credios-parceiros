"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { requestPasswordResetAction, type ActionState } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function RequestResetForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    requestPasswordResetAction,
    null
  );

  if (state?.ok) {
    return (
      <div
        className="mt-6 flex items-start gap-3 rounded-md bg-status-success-bg px-4 py-4"
        role="status"
      >
        <MailCheck
          size={20}
          className="text-status-success shrink-0 mt-0.5"
          aria-hidden
        />
        <div>
          <p className="text-sm font-medium text-status-success">
            Se este email estiver cadastrado, você receberá o link em instantes.
          </p>
          <p className="t-caption text-neutral-500 mt-1">
            Confira também a caixa de spam. O link vale por 1 hora.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email} required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com.br"
          required
        />
      </Field>

      <SubmitButton size="lg" pendingLabel="Enviando…" className="mt-1 w-full">
        Enviar link de recuperação
      </SubmitButton>

      <p className="text-center">
        <Link
          href="/entrar"
          className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-credios-blue hover:text-credios-blue-700 transition-colors duration-150"
        >
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
