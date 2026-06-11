import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { RequestResetForm } from "./request-reset-form";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Receba um link por email para redefinir sua senha de acesso.",
};

export default function RequestResetPage() {
  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-12 sm:py-16">
      <Card tone="white" className="sm:p-8">
        <h1 className="t-heading text-credios-charcoal">Recuperar senha</h1>
        <p className="t-body text-neutral-500 mt-1">
          Informe o email da sua conta e enviaremos um link para criar uma nova
          senha.
        </p>
        <RequestResetForm />
      </Card>
    </div>
  );
}
