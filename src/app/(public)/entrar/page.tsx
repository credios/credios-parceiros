import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
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

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 sm:px-6 py-12 sm:py-16">
      <div className="flex justify-center mb-6">
        <Image
          src="/credios-logo.png"
          alt="Credios"
          width={150}
          height={40}
          className="h-10 w-auto"
          priority
        />
      </div>
      <Card tone="white" className="sm:p-8">
        <h1 className="t-heading text-credios-charcoal">Entrar no portal</h1>
        <p className="t-body text-neutral-500 mt-1">
          Acompanhe suas indicações e comissões.
        </p>
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
    </div>
  );
}
