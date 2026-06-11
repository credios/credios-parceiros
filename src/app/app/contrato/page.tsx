import Link from "next/link";
import { BadgeCheck, Clock, Download, FileSignature } from "lucide-react";
import { requirePartnerSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { signContractAction } from "@/lib/actions/partner";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Contrato" };

export default async function ContratoPage() {
  const { partnerId } = await requirePartnerSession();

  const contract = await prisma.contract.findFirst({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, signedAt: true, verifyCode: true },
  });

  const signed = contract?.status === "SIGNED";
  const partnerSigned = contract?.status === "PARTNER_SIGNED";

  return (
    <div className="max-w-2xl">
      <div className="animate-fade-up">
        <PageHeader
          title="Contrato"
          description="Seu contrato de parceria com a Credios."
        />
      </div>

      {partnerSigned ? (
        <Card tone="white" className="animate-fade-up-1">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-credios-gold-50">
              <Clock size={22} className="text-credios-gold-700" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="t-heading text-credios-charcoal">
                Assinado por você — aguardando a Credios
              </h2>
              <p className="t-caption text-neutral-500 mt-1">
                Sua assinatura foi registrada em {formatDateTime(contract.signedAt)}
              </p>
              <p className="t-body text-neutral-500 mt-3">
                Seu acesso já está liberado. Falta apenas a assinatura institucional
                da Credios — assim que ela for concluída, você recebe por email a
                cópia final em PDF, com as duas assinaturas e a trilha de auditoria
                completa, e ela também fica disponível para download aqui.
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-md bg-credios-ivory p-4">
            <p className="t-caption text-neutral-500">Código de verificação</p>
            <p className="font-mono text-lg font-semibold tracking-widest text-credios-charcoal mt-1">
              {contract.verifyCode}
            </p>
          </div>
        </Card>
      ) : signed ? (
        <Card tone="white" className="animate-fade-up-1">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-status-success-bg">
              <BadgeCheck size={22} className="text-status-success" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="t-heading text-credios-charcoal">
                Contrato de parceria assinado
              </h2>
              <p className="t-caption text-neutral-500 mt-1">
                Assinado eletronicamente em {formatDateTime(contract.signedAt)}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-md bg-credios-ivory p-4">
            <p className="t-caption text-neutral-500">Código de verificação</p>
            <p className="font-mono text-lg font-semibold tracking-widest text-credios-charcoal mt-1">
              {contract.verifyCode}
            </p>
            <p className="t-caption text-neutral-500 mt-2">
              Qualquer pessoa pode confirmar a autenticidade do documento em{" "}
              <Link
                href={`/verificar/${contract.verifyCode}`}
                className="text-credios-blue hover:underline"
              >
                parceiros.credios.com.br/verificar
              </Link>
              .
            </p>
          </div>

          <a
            href={`/api/contracts/${contract.id}/download`}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-credios-blue px-5 py-2.5 min-h-11 text-sm font-semibold text-white shadow-sm border border-credios-blue-300/30 transition-[filter] duration-150 hover:brightness-110"
          >
            <Download size={16} aria-hidden />
            Baixar PDF assinado
          </a>
        </Card>
      ) : (
        <Card tone="white" className="animate-fade-up-1">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-credios-blue-50">
              <FileSignature size={22} className="text-credios-blue" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="t-heading text-credios-charcoal">
                Contrato pendente de assinatura
              </h2>
              <p className="t-body text-neutral-500 mt-2">
                Seu contrato de parceria ainda não foi assinado. A assinatura é 100%
                eletrônica: você lê o documento, confirma sua identidade com um código
                enviado ao seu email e assina em poucos cliques.
              </p>
            </div>
          </div>
          <form action={signContractAction} className="mt-6">
            <SubmitButton size="lg" pendingLabel="Preparando o contrato...">
              Ler e assinar contrato
            </SubmitButton>
          </form>
        </Card>
      )}
    </div>
  );
}
