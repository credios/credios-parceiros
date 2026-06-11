import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Redefinir senha",
  description: "Crie uma nova senha de acesso ao Portal de Parceiros Credios.",
};

function InvalidResetLink() {
  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-16 sm:py-24">
      <Card tone="white" className="text-center sm:p-8">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-credios-blue-50">
          <KeyRound size={22} className="text-credios-blue" aria-hidden />
        </span>
        <h1 className="t-heading text-credios-charcoal mt-4">
          Este link expirou ou já foi usado
        </h1>
        <p className="t-body text-neutral-500 mt-2">
          Por segurança, o link de redefinição vale por 1 hora e só pode ser usado
          uma vez. Peça um novo — leva segundos.
        </p>
        <div className="mt-6">
          <ButtonLink href="/recuperar-senha">Pedir novo link</ButtonLink>
        </div>
      </Card>
    </div>
  );
}

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const user = await prisma.user.findUnique({
    where: { resetToken: hashToken(token) },
    select: { id: true, resetExpiry: true },
  });

  if (!user || !user.resetExpiry || user.resetExpiry <= new Date()) {
    return <InvalidResetLink />;
  }

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-12 sm:py-16">
      <Card tone="white" className="sm:p-8">
        <h1 className="t-heading text-credios-charcoal">Criar nova senha</h1>
        <p className="t-body text-neutral-500 mt-1">
          Escolha uma senha com pelo menos 10 caracteres.
        </p>
        <ResetPasswordForm token={token} />
      </Card>
    </div>
  );
}
