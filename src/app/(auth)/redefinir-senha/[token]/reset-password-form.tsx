"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { resetPasswordAction, type ActionState } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    null
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

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

      <Field
        label="Nova senha"
        htmlFor="password"
        error={state?.fieldErrors?.password}
        hint="Mínimo de 10 caracteres."
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>

      <Field
        label="Confirmar nova senha"
        htmlFor="confirmPassword"
        error={state?.fieldErrors?.confirmPassword}
        required
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>

      <SubmitButton size="lg" pendingLabel="Salvando…" className="mt-1 w-full">
        Salvar nova senha
      </SubmitButton>
    </form>
  );
}
