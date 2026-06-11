import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = {
  title: "Verificar autenticidade de contrato — Credios",
  description:
    "Confirme a autenticidade de um contrato assinado eletronicamente pelo Assinador Credios.",
};

export default function VerifyPage() {
  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-12 sm:py-20">
      <div className="mb-6 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-credios-blue-50 mb-4">
          <ShieldCheck size={26} className="text-credios-blue" aria-hidden />
        </span>
        <h1 className="t-display-md text-credios-charcoal">Verificar documento</h1>
        <p className="t-body text-neutral-500 mt-2">
          Digite o código de verificação para confirmar a autenticidade de um
          contrato assinado pelo Assinador Credios.
        </p>
      </div>
      <Card tone="white">
        <VerifyForm />
      </Card>
    </div>
  );
}
