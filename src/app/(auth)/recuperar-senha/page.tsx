import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { Card } from "@/components/ui/card";
import { RequestResetForm } from "./request-reset-form";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Receba um link por email para redefinir sua senha de acesso.",
};

export default function RequestResetPage() {
  return (
    <AuthShell>
      <Card tone="white" className="sm:p-8 shadow-md">
        <h1 className="t-heading text-credios-charcoal">Recuperar senha</h1>
        <p className="t-body text-neutral-500 mt-1">
          Informe o email da sua conta e enviaremos um link para criar uma nova
          senha.
        </p>
        <RequestResetForm />
      </Card>
    </AuthShell>
  );
}
