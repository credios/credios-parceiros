import type { Metadata } from "next";
import { headers } from "next/headers";
import { CheckCircle2, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { formatDateExtenso, mergeTemplate } from "@/lib/contracts/merge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SignFlow } from "./sign-flow";

export const metadata: Metadata = {
  title: "Assinatura do contrato de parceria — Credios",
  robots: { index: false, follow: false },
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 1)}***@${domain}`;
}

function StatusScreen({
  icon,
  title,
  description,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-16 sm:py-24">
      <Card tone="white" className="flex flex-col items-center gap-4 text-center p-8 sm:p-10">
        {icon}
        <h1 className="t-heading text-credios-charcoal">{title}</h1>
        <p className="t-body text-neutral-500">{description}</p>
        {cta}
      </Card>
    </div>
  );
}

export default async function ContractSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const contract = await prisma.contract.findUnique({
    where: { signToken: hashToken(token) },
    include: { partner: true, template: true },
  });

  if (contract?.status === "SIGNED") {
    return (
      <StatusScreen
        icon={
          <span className="flex size-14 items-center justify-center rounded-full bg-credios-gold-50">
            <CheckCircle2 size={32} className="text-credios-gold-700" aria-hidden />
          </span>
        }
        title="Contrato assinado"
        description={`Este contrato já foi assinado. Código de verificação: ${contract.verifyCode}. Uma cópia em PDF foi enviada para o email cadastrado.`}
        cta={<ButtonLink href="/entrar">Acessar o portal</ButtonLink>}
      />
    );
  }

  const pending =
    contract &&
    (contract.status === "SENT" || contract.status === "VIEWED") &&
    contract.signTokenExp > new Date();

  if (!contract || !pending) {
    return (
      <StatusScreen
        icon={
          <span className="flex size-14 items-center justify-center rounded-full bg-status-warning-bg">
            <Clock size={32} className="text-status-warning" aria-hidden />
          </span>
        }
        title="Este link expirou"
        description="Por segurança, links de assinatura valem por 7 dias. Entre em contato com a Credios ou faça login para gerar um novo."
        cta={<ButtonLink href="/entrar">Fazer login</ButtonLink>}
      />
    );
  }

  // Primeiro acesso: marca visualização + trilha de auditoria (uma única vez)
  if (!contract.viewedAt) {
    const h = await headers();
    await prisma.$transaction([
      prisma.contract.update({
        where: { id: contract.id },
        data: {
          viewedAt: new Date(),
          status: contract.status === "SENT" ? "VIEWED" : contract.status,
        },
      }),
      prisma.contractAuditEvent.create({
        data: {
          contractId: contract.id,
          event: "LINK_OPENED",
          ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: h.get("user-agent"),
        },
      }),
    ]);
  }

  const merged = mergeTemplate(contract.template.bodyHtml, {
    partner: contract.partner,
    rate: Number(contract.partner.commissionRate.toString()).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    date: formatDateExtenso(contract.sentAt ?? contract.createdAt),
    verifyCode: contract.verifyCode,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
      <header className="mb-6 sm:mb-8">
        <p className="t-eyebrow text-credios-blue mb-2">Assinador Credios</p>
        <h1 className="t-display-md text-credios-charcoal">Contrato de parceria</h1>
        <p className="t-body text-neutral-500 mt-1.5">
          Preparado para <span className="font-semibold text-credios-charcoal">{contract.partner.legalName}</span>
        </p>
      </header>
      <SignFlow
        token={token}
        contractHtml={merged}
        maskedEmail={maskEmail(contract.partner.email)}
        verifyCode={contract.verifyCode}
        pdfPath={`/api/contracts/sign/${encodeURIComponent(token)}/pdf`}
      />
    </div>
  );
}
