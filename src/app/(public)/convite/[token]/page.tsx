import type { Metadata } from "next";
import { FileSignature, MailQuestion } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { formatDocument } from "@/lib/format";
import { ARCHETYPES, CREDIOS } from "@/lib/credios";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { AcceptInviteForm } from "./accept-invite-form";

export const metadata: Metadata = {
  title: "Convite de parceria",
  description: "Crie sua senha e ative seu acesso ao Portal de Parceiros Credios.",
};

function InvalidInvite() {
  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-16 sm:py-24">
      <Card tone="white" className="text-center sm:p-8">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-credios-blue-50">
          <MailQuestion size={22} className="text-credios-blue" aria-hidden />
        </span>
        <h1 className="t-heading text-credios-charcoal mt-4">
          Este convite expirou ou já foi usado
        </h1>
        <p className="t-body text-neutral-500 mt-2">
          Por segurança, o link de convite vale por tempo limitado e só pode ser
          usado uma vez. Peça um novo convite à equipe Credios — leva menos de um
          minuto.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <ButtonLink
            href={`mailto:${CREDIOS.emailParcerias}?subject=${encodeURIComponent(
              "Novo convite para o Portal de Parceiros"
            )}`}
          >
            Pedir novo convite por email
          </ButtonLink>
          <p className="t-caption text-neutral-400">
            Ou fale com a gente pelo WhatsApp: {CREDIOS.whatsapp}
          </p>
        </div>
      </Card>
    </div>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const user = await prisma.user.findUnique({
    where: { inviteToken: hashToken(token) },
    include: { partner: true },
  });

  if (!user || !user.inviteExpiry || user.inviteExpiry <= new Date()) {
    return <InvalidInvite />;
  }

  // Convite de GERENTE do programa (admin): boas-vindas simples, sem contrato.
  if (user.role === "ADMIN" || user.role === "ADMIN_MASTER") {
    return (
      <div className="mx-auto max-w-lg px-4 sm:px-6 py-12 sm:py-16">
        <p className="t-eyebrow text-credios-gold-700 text-center">
          Equipe Credios
        </p>
        <h1 className="t-display-md text-credios-charcoal text-center mt-3">
          Bem-vindo(a), {user.name.split(" ")[0]}
        </h1>
        <p className="t-body text-neutral-500 text-center mt-3">
          Você foi cadastrado(a) como gerente do programa de parcerias
          ({user.email}). Crie sua senha para acessar o painel e gerenciar a sua
          carteira de parceiros.
        </p>
        <Card tone="white" className="mt-8">
          <AcceptInviteForm token={token} />
        </Card>
      </div>
    );
  }

  if (user.role !== "PARTNER" || !user.partner) {
    return <InvalidInvite />;
  }

  const partner = user.partner;
  const archetypeLabel =
    ARCHETYPES.find((a) => a.value === partner.archetype)?.label ?? "Parceiro";

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-12 sm:py-16">
      <p className="t-eyebrow text-credios-gold-700 text-center">
        Programa de parcerias
      </p>
      <h1 className="t-display-md text-credios-charcoal text-center mt-3">
        Bem-vindo(a) à Credios, {user.name.split(" ")[0]}
      </h1>
      <p className="t-body text-neutral-500 text-center mt-3">
        Confira seus dados e crie a senha de acesso ao portal.
      </p>

      <Card tone="white" className="mt-8">
        <h2 className="t-eyebrow text-neutral-400">Seus dados cadastrados</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="t-caption text-neutral-400">
              {partner.personType === "PJ" ? "Razão social" : "Nome completo"}
            </dt>
            <dd className="text-sm font-medium text-credios-charcoal mt-0.5">
              {partner.legalName}
            </dd>
          </div>
          <div>
            <dt className="t-caption text-neutral-400">
              {partner.personType === "PJ" ? "CNPJ" : "CPF"}
            </dt>
            <dd className="text-sm font-medium text-credios-charcoal mt-0.5">
              {formatDocument(partner.document)}
            </dd>
          </div>
          <div>
            <dt className="t-caption text-neutral-400">Email de acesso</dt>
            <dd className="text-sm font-medium text-credios-charcoal mt-0.5 break-all">
              {user.email}
            </dd>
          </div>
          <div>
            <dt className="t-caption text-neutral-400">Tipo de parceiro</dt>
            <dd className="text-sm font-medium text-credios-charcoal mt-0.5">
              {archetypeLabel}
            </dd>
          </div>
        </dl>
        <p className="t-caption text-neutral-400 mt-4">
          Algum dado errado? Avise em {CREDIOS.emailParcerias} antes de continuar.
        </p>
      </Card>

      <Card tone="white" className="mt-4">
        <AcceptInviteForm token={token} />
      </Card>

      <div className="mt-6 flex items-start gap-3 rounded-md bg-credios-blue-50 px-4 py-3">
        <FileSignature
          size={18}
          className="text-credios-blue shrink-0 mt-0.5"
          aria-hidden
        />
        <p className="text-sm text-credios-blue-900">
          <strong>Próximo passo:</strong> depois de criar a senha, você vai ler e
          assinar eletronicamente o contrato de parceria. Leva poucos minutos.
        </p>
      </div>
    </div>
  );
}
