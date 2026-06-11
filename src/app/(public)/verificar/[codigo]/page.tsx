import type { Metadata } from "next";
import Link from "next/link";
import { Clock, SearchX, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { maskDocument } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Verificação de autenticidade — Credios",
  robots: { index: false, follow: false },
};

function formatUtc(d: Date): string {
  return `${d.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

function formatBrasilia(d: Date): string {
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ResultShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-12 sm:py-20">{children}</div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-black/5 last:border-b-0">
      <dt className="t-caption text-neutral-400">{label}</dt>
      <dd className="text-sm font-medium text-credios-charcoal">{value}</dd>
    </div>
  );
}

export default async function VerifyCodePage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const code = decodeURIComponent(codigo)
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");

  const contract = code
    ? await prisma.contract.findFirst({
        where: { verifyCode: { equals: code, mode: "insensitive" } },
        include: {
          partner: { select: { legalName: true, document: true } },
          template: { select: { version: true, name: true } },
        },
      })
    : null;

  if (!contract) {
    return (
      <ResultShell>
        <Card tone="white" className="flex flex-col items-center gap-4 text-center p-8">
          <span className="flex size-14 items-center justify-center rounded-full bg-status-danger-bg">
            <SearchX size={30} className="text-status-danger" aria-hidden />
          </span>
          <h1 className="t-heading text-credios-charcoal">Código não encontrado</h1>
          <p className="t-body text-neutral-500">
            Não localizamos nenhum contrato com o código{" "}
            <span className="font-mono font-semibold">{code || "—"}</span>.
            Confira se digitou exatamente como aparece no rodapé do PDF
            (formato CRD-XXXX-XXXX) e tente de novo.
          </p>
          <ButtonLink href="/verificar" variant="outline">
            Tentar outro código
          </ButtonLink>
        </Card>
      </ResultShell>
    );
  }

  if (contract.status === "PARTNER_SIGNED" && contract.signedAt) {
    return (
      <ResultShell>
        <Card tone="white" className="flex flex-col items-center gap-4 text-center p-8">
          <span className="flex size-14 items-center justify-center rounded-full bg-credios-gold-50">
            <Clock size={30} className="text-credios-gold-700" aria-hidden />
          </span>
          <h1 className="t-heading text-credios-charcoal">
            Assinatura em andamento
          </h1>
          <p className="t-body text-neutral-500">
            O código{" "}
            <span className="font-mono font-semibold">{contract.verifyCode}</span>{" "}
            corresponde a um contrato já assinado pelo(a) parceiro(a){" "}
            <span className="font-medium text-credios-charcoal">
              {contract.partner.legalName}
            </span>{" "}
            em {formatBrasilia(contract.signedAt)}, aguardando a assinatura
            institucional da Credios. O documento final, com as duas assinaturas e
            o hash de integridade, fica disponível após a conclusão.
          </p>
        </Card>
      </ResultShell>
    );
  }

  if (contract.status !== "SIGNED" || !contract.signedAt) {
    return (
      <ResultShell>
        <Card tone="white" className="flex flex-col items-center gap-4 text-center p-8">
          <span className="flex size-14 items-center justify-center rounded-full bg-status-warning-bg">
            <Clock size={30} className="text-status-warning" aria-hidden />
          </span>
          <h1 className="t-heading text-credios-charcoal">
            Contrato ainda não assinado
          </h1>
          <p className="t-body text-neutral-500">
            O código <span className="font-mono font-semibold">{contract.verifyCode}</span>{" "}
            corresponde a um contrato que ainda não foi assinado eletronicamente.
            A verificação de autenticidade só vale para documentos assinados.
          </p>
        </Card>
      </ResultShell>
    );
  }

  return (
    <ResultShell>
      <Card tone="white" className="p-8">
        <div className="flex flex-col items-center gap-3 text-center mb-6">
          <span className="flex size-14 items-center justify-center rounded-full bg-status-success-bg">
            <ShieldCheck size={30} className="text-status-success" aria-hidden />
          </span>
          <h1 className="t-heading text-credios-charcoal">Documento autêntico</h1>
          <p className="t-caption text-neutral-500">
            Contrato de parceria assinado eletronicamente pelo Assinador Credios.
          </p>
        </div>

        <dl>
          <InfoRow
            label="Signatário — parceiro(a)"
            value={contract.partner.legalName}
          />
          <InfoRow
            label="CPF/CNPJ"
            value={maskDocument(contract.partner.document)}
          />
          <InfoRow
            label="Parceiro assinou em (Brasília)"
            value={formatBrasilia(contract.signedAt)}
          />
          <InfoRow
            label="Parceiro assinou em (UTC)"
            value={formatUtc(contract.signedAt)}
          />
          {contract.adminSignedAt && (
            <>
              <InfoRow
                label="Signatário — contratada"
                value={`Credios Serviços Ltda${contract.adminSignerName ? `, por ${contract.adminSignerName}` : ""}`}
              />
              <InfoRow
                label="Credios assinou em (Brasília)"
                value={formatBrasilia(contract.adminSignedAt)}
              />
            </>
          )}
          <InfoRow
            label="Minuta"
            value={`${contract.template.name} — versão ${contract.template.version}`}
          />
          <InfoRow
            label="Código de verificação"
            value={<span className="font-mono">{contract.verifyCode}</span>}
          />
          {contract.documentHash && (
            <InfoRow
              label="Hash SHA-256 do documento assinado"
              value={
                <span className="font-mono text-xs break-all">
                  {contract.documentHash}
                </span>
              }
            />
          )}
        </dl>

        <div className="mt-6 rounded-md bg-credios-ivory p-4">
          <p className="t-caption text-neutral-500">
            Para conferir a integridade do PDF que você recebeu, calcule o hash
            SHA-256 do arquivo e compare com o valor acima. No macOS/Linux:{" "}
            <code className="font-mono text-xs text-credios-charcoal">
              shasum -a 256 arquivo.pdf
            </code>
            . No Windows (PowerShell):{" "}
            <code className="font-mono text-xs text-credios-charcoal">
              Get-FileHash arquivo.pdf
            </code>
            . Se os valores coincidirem, o documento não foi alterado.
          </p>
        </div>

        <p className="t-caption text-neutral-400 mt-4 text-center">
          Dúvidas? Fale com a Credios em{" "}
          <Link href="/" className="text-credios-blue hover:underline">
            parceiros.credios.com.br
          </Link>
          .
        </p>
      </Card>
    </ResultShell>
  );
}
