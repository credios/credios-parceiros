import { prisma } from "@/lib/prisma";
import { generateToken, generateVerifyCode } from "@/lib/tokens";
import { formatDateExtenso, mergeTemplate } from "@/lib/contracts/merge";
import { renderContractPdf } from "@/lib/contracts/pdf";
import { sendContractReadyEmail } from "@/lib/email/templates";
import type { Partner, Prisma } from "@prisma/client";

/**
 * Orquestração do ciclo de vida do contrato de parceria
 * (geração → envio → reenvio). O fluxo de assinatura em si vive em
 * src/lib/actions/contract-sign.ts.
 */

const SIGN_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

const PENDING_STATUSES = ["SENT", "VIEWED"] as const;

function tokenExpiry(): Date {
  return new Date(Date.now() + SIGN_TOKEN_TTL_MS);
}

function rateString(rate: Prisma.Decimal | number): string {
  return Number(rate.toString()).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function getActiveTemplate() {
  const template = await prisma.contractTemplate.findFirst({
    where: { active: true },
    orderBy: { version: "desc" },
  });
  if (!template) {
    throw new Error(
      "Nenhum template de contrato ativo — cadastre um em /admin antes de enviar contratos."
    );
  }
  return template;
}

async function renderForPartner(
  partner: Partner,
  bodyHtml: string,
  verifyCode: string
): Promise<Uint8Array> {
  const merged = mergeTemplate(bodyHtml, {
    partner,
    rate: rateString(partner.commissionRate),
    date: formatDateExtenso(new Date()),
    verifyCode,
  });
  return renderContractPdf(merged, { verifyCode });
}

/**
 * Gera (ou regenera) o contrato do parceiro, envia o email com o link de
 * assinatura e retorna o caminho do fluxo público. Se já houver contrato
 * pendente (SENT/VIEWED), reaproveita o registro: novo token, PDF e email —
 * nunca duplica contratos.
 */
export async function createAndSendContract(
  partnerId: string
): Promise<{ signPath: string }> {
  const partner = await prisma.partner.findUniqueOrThrow({
    where: { id: partnerId },
  });
  const template = await getActiveTemplate();

  const existing = await prisma.contract.findFirst({
    where: { partnerId, status: { in: [...PENDING_STATUSES] } },
    orderBy: { createdAt: "desc" },
  });

  const { token, hash } = generateToken();
  const verifyCode = existing?.verifyCode ?? generateVerifyCode();
  const pdfUnsigned = Buffer.from(
    await renderForPartner(partner, template.bodyHtml, verifyCode)
  );
  const now = new Date();

  const contract = existing
    ? await prisma.contract.update({
        where: { id: existing.id },
        data: {
          templateId: template.id,
          status: "SENT",
          signToken: hash,
          signTokenExp: tokenExpiry(),
          pdfUnsigned,
          sentAt: now,
          otpHash: null,
          otpExpiry: null,
          otpAttempts: 0,
          otpVerified: false,
        },
      })
    : await prisma.contract.create({
        data: {
          partnerId,
          templateId: template.id,
          status: "SENT",
          signToken: hash,
          signTokenExp: tokenExpiry(),
          verifyCode,
          pdfUnsigned,
          sentAt: now,
        },
      });

  await prisma.contractAuditEvent.createMany({
    data: [
      { contractId: contract.id, event: "GENERATED" },
      { contractId: contract.id, event: "SENT" },
    ],
  });

  await sendContractReadyEmail({
    to: partner.email,
    partnerName: partner.legalName,
    token,
  });

  return { signPath: `/contrato/${token}` };
}

/**
 * Para o parceiro logado: regenera o link de assinatura do contrato pendente
 * (novo token, +7 dias) ou gera um contrato novo se não houver nenhum.
 * Lança erro se o contrato já foi assinado.
 */
export async function getOrCreateSignLink(partnerId: string): Promise<string> {
  const pending = await prisma.contract.findFirst({
    where: { partnerId, status: { in: [...PENDING_STATUSES] } },
    orderBy: { createdAt: "desc" },
  });

  if (pending) {
    const { token, hash } = generateToken();
    await prisma.contract.update({
      where: { id: pending.id },
      data: { signToken: hash, signTokenExp: tokenExpiry() },
    });
    return `/contrato/${token}`;
  }

  const signed = await prisma.contract.findFirst({
    where: { partnerId, status: { in: ["SIGNED", "PARTNER_SIGNED"] } },
  });
  if (signed) {
    throw new Error("Este parceiro já assinou o contrato de parceria.");
  }

  const { signPath } = await createAndSendContract(partnerId);
  return signPath;
}

/** Admin: regenera o token do contrato e reenvia o email de assinatura. */
export async function resendContract(contractId: string): Promise<void> {
  const contract = await prisma.contract.findUniqueOrThrow({
    where: { id: contractId },
    include: { partner: true },
  });
  if (
    contract.status === "SIGNED" ||
    contract.status === "PARTNER_SIGNED" ||
    contract.status === "CANCELLED"
  ) {
    throw new Error("Este contrato não está mais pendente da assinatura do parceiro.");
  }

  const { token, hash } = generateToken();
  await prisma.contract.update({
    where: { id: contract.id },
    data: {
      status: "SENT",
      signToken: hash,
      signTokenExp: tokenExpiry(),
      sentAt: new Date(),
    },
  });
  await prisma.contractAuditEvent.create({
    data: { contractId: contract.id, event: "SENT" },
  });
  await sendContractReadyEmail({
    to: contract.partner.email,
    partnerName: contract.partner.legalName,
    token,
  });
}
