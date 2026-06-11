"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { loginAction, type ActionState } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    loginAction,
    null
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
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

      <Field
        label="Senha"
        htmlFor="password"
        error={state?.fieldErrors?.password}
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          required
        />
      </Field>

      <SubmitButton size="lg" pendingLabel="Entrando…" className="mt-1 w-full">
        Entrar
      </SubmitButton>

      <p className="text-center">
        <Link
          href="/recuperar-senha"
          className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-credios-blue hover:text-credios-blue-700 transition-colors duration-150"
        >
          Esqueci minha senha
        </Link>
      </p>
    </form>
  );
}
