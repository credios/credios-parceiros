import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse o Portal de Parceiros Credios.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const resetOk = params.reset === "ok";
  const contaOk = params.conta === "ok";

  return (
    <AuthShell>
      <Card tone="white" className="sm:p-8 shadow-md">
        <h1 className="t-display-md text-credios-charcoal">Entrar</h1>
        <p className="t-body text-neutral-500 mt-1.5">
          Acompanhe suas indicações e comissões.
        </p>
        {contaOk && (
          <div
            className="mt-4 flex items-start gap-2 rounded-md bg-status-success-bg px-4 py-3"
            role="status"
          >
            <CheckCircle2
              size={18}
              className="text-status-success shrink-0 mt-0.5"
              aria-hidden
            />
            <p className="text-sm text-status-success">
              Conta criada. Entre com seu email e a senha que você definiu.
            </p>
          </div>
        )}
        {resetOk && (
          <div
            className="mt-4 flex items-start gap-2 rounded-md bg-status-success-bg px-4 py-3"
            role="status"
          >
            <CheckCircle2
              size={18}
              className="text-status-success shrink-0 mt-0.5"
              aria-hidden
            />
            <p className="text-sm text-status-success">
              Senha redefinida. Entre com a nova senha.
            </p>
          </div>
        )}
        <LoginForm />
      </Card>
    </AuthShell>
  );
}
