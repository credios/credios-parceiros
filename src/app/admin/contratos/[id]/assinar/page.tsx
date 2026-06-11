import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileSignature } from "lucide-react";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatDocument } from "@/lib/format";
import { CREDIOS } from "@/lib/credios";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { ContractStatusBadge } from "@/components/ui/badge";
import { AdminSignForm } from "./admin-sign-form";

export const metadata = { title: "Assinar contrato" };

/** Contra-assinatura da Credios — admin autenticado revisa e assina. */
export default async function AdminSignContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { partner: true },
  });
  if (!contract) notFound();

  if (contract.status === "SIGNED") {
    return (
      <div className="mx-auto max-w-xl animate-fade-up">
        <Card tone="white" className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-credios-gold-50">
            <CheckCircle2 size={32} className="text-credios-gold-700" aria-hidden />
          </span>
          <h1 className="t-heading text-credios-charcoal">Contrato concluído</h1>
          <p className="t-body text-neutral-500">
            Assinado pelo parceiro em {formatDateTime(contract.signedAt)} e pela
            Credios ({contract.adminSignerName}) em{" "}
            {formatDateTime(contract.adminSignedAt)}. As cópias foram enviadas por
            email.
          </p>
          <ButtonLink href="/admin/contratos" variant="outline">
            Voltar para contratos
          </ButtonLink>
        </Card>
      </div>
    );
  }

  if (contract.status !== "PARTNER_SIGNED") {
    return (
      <div className="mx-auto max-w-xl animate-fade-up">
        <Card tone="white" className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-status-warning-bg">
            <FileSignature size={28} className="text-status-warning" aria-hidden />
          </span>
          <h1 className="t-heading text-credios-charcoal">
            Aguardando a assinatura do parceiro
          </h1>
          <p className="t-body text-neutral-500">
            A contra-assinatura da Credios só fica disponível depois que{" "}
            {contract.partner.legalName} assinar. Status atual:{" "}
          </p>
          <ContractStatusBadge status={contract.status} />
          <ButtonLink href="/admin/contratos" variant="outline">
            Voltar para contratos
          </ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="animate-fade-up">
        <Link
          href="/admin/contratos"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-credios-blue hover:text-credios-blue-700 transition-colors duration-150"
        >
          <ArrowLeft size={16} aria-hidden /> Contratos
        </Link>
        <h1 className="t-display-md text-credios-charcoal mt-2">
          Contra-assinatura da Credios
        </h1>
        <p className="t-body text-neutral-500 mt-1.5">
          Revise o documento e assine como representante da {CREDIOS.razaoSocial}.
          Só depois da sua assinatura as cópias finais são enviadas às partes.
        </p>
      </div>

      <Card tone="outlined" className="mt-6 animate-fade-up-1">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="t-eyebrow text-neutral-400">Parceiro(a)</dt>
            <dd className="t-body mt-1 font-medium text-credios-charcoal">
              {contract.partner.legalName}
            </dd>
          </div>
          <div>
            <dt className="t-eyebrow text-neutral-400">CPF/CNPJ</dt>
            <dd className="t-body mt-1">{formatDocument(contract.partner.document)}</dd>
          </div>
          <div>
            <dt className="t-eyebrow text-neutral-400">Assinado pelo parceiro em</dt>
            <dd className="t-body mt-1">{formatDateTime(contract.signedAt)}</dd>
          </div>
          <div>
            <dt className="t-eyebrow text-neutral-400">Código de verificação</dt>
            <dd className="t-body mt-1 font-mono">{contract.verifyCode}</dd>
          </div>
        </dl>
      </Card>

      {/* Documento na íntegra (PDF que o parceiro assinou) */}
      <div className="mt-6 overflow-hidden rounded-lg border border-black/5 shadow-md animate-fade-up-2 bg-white">
        <iframe
          src={`/api/contracts/${contract.id}/download#view=FitH`}
          title="Contrato de parceria — documento completo"
          className="h-[70vh] w-full"
        />
      </div>

      <Card tone="white" className="mt-6 shadow-md">
        <AdminSignForm contractId={contract.id} signerLabel={CREDIOS.razaoSocial} />
      </Card>
    </div>
  );
}
