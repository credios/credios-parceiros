"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { acceptInviteAction, type ActionState } from "@/lib/actions/auth";
import { Field, Input, Checkbox } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";

type Strength = { label: string; bar: string; width: string } | null;

function getStrength(password: string): Strength {
  if (!password) return null;
  if (password.length < 10) {
    return { label: "Senha fraca", bar: "bg-status-danger", width: "w-1/3" };
  }
  const hasNumberAndLetter = /\d/.test(password) && /[a-zA-Z]/.test(password);
  if (password.length >= 12 && hasNumberAndLetter) {
    return { label: "Senha forte", bar: "bg-status-success", width: "w-full" };
  }
  return { label: "Senha média", bar: "bg-status-warning", width: "w-2/3" };
}

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    acceptInviteAction,
    null
  );
  const [password, setPassword] = useState("");
  const strength = getStrength(password);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h2 className="t-heading text-credios-charcoal">Crie sua senha</h2>
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
        label="Senha"
        htmlFor="password"
        error={state?.fieldErrors?.password}
        hint="Mínimo de 10 caracteres. Use 12 ou mais com letras e números para uma senha forte."
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {strength && (
          <div className="mt-1">
            <div className="h-1.5 w-full rounded-full bg-neutral-100">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out",
                  strength.bar,
                  strength.width
                )}
              />
            </div>
            <p className="t-caption text-neutral-500 mt-1" aria-live="polite">
              {strength.label}
            </p>
          </div>
        )}
      </Field>

      <Field
        label="Confirmar senha"
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

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="acceptedTerms"
          className="flex items-start gap-3 cursor-pointer min-h-11 py-1"
        >
          <Checkbox id="acceptedTerms" name="acceptedTerms" className="mt-0.5" />
          <span className="text-sm text-credios-charcoal">
            Li e aceito os{" "}
            <Link
              href="/termos"
              target="_blank"
              className="font-medium text-credios-blue hover:underline"
            >
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link
              href="/privacidade"
              target="_blank"
              className="font-medium text-credios-blue hover:underline"
            >
              Política de Privacidade
            </Link>
            .
          </span>
        </label>
        {state?.fieldErrors?.acceptedTerms && (
          <p className="t-caption text-status-danger" role="alert">
            {state.fieldErrors.acceptedTerms}
          </p>
        )}
      </div>

      <SubmitButton size="lg" pendingLabel="Criando acesso…" className="mt-1 w-full">
        Criar senha e continuar
      </SubmitButton>
    </form>
  );
}
