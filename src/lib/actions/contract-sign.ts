"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { generateOtp, hashToken, safeEqualHex } from "@/lib/tokens";
import {
  sendAdminCountersignEmail,
  sendOtpEmail,
  sendPartnerSignedEmail,
} from "@/lib/email/templates";

/**
 * Server actions do fluxo público de assinatura. O cliente envia o token RAW
 * (do link /contrato/[token]); localizamos o contrato pelo SHA-256 do token.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const INVALID_LINK: ActionResult = {
  ok: false,
  error: "Este link de assinatura é inválido ou expirou. Faça login para gerar um novo.",
};

const OTP_EXPIRY_MS = 10 * 60 * 1000;

async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent"),
  };
}

/** Localiza contrato pendente (SENT/VIEWED) por token raw, validando expiração. */
async function findPendingContract(token: string) {
  if (!token) return null;
  const contract = await prisma.contract.findUnique({
    where: { signToken: hashToken(token) },
    include: { partner: true },
  });
  if (!contract) return null;
  if (contract.status !== "SENT" && contract.status !== "VIEWED") return null;
  if (contract.signTokenExp < new Date()) return null;
  return contract;
}

/** Etapa 1 do OTP: gera e envia o código de 6 dígitos para o email do parceiro. */
export async function sendSignOtpAction(token: string): Promise<ActionResult> {
  const contract = await findPendingContract(token);
  if (!contract) return INVALID_LINK;

  const allowed = await rateLimit(`otp:${contract.id}`, {
    max: 3,
    windowMinutes: 10,
  });
  if (!allowed) {
    return {
      ok: false,
      error: "Muitos códigos enviados. Aguarde alguns minutos e tente de novo.",
    };
  }

  const { otp, hash } = generateOtp();
  await prisma.contract.update({
    where: { id: contract.id },
    data: {
      otpHash: hash,
      otpExpiry: new Date(Date.now() + OTP_EXPIRY_MS),
      otpAttempts: 0,
      otpVerified: false,
    },
  });

  const { ip, userAgent } = await requestMeta();
  await prisma.contractAuditEvent.create({
    data: { contractId: contract.id, event: "OTP_SENT", ip, userAgent },
  });

  const sent = await sendOtpEmail({ to: contract.partner.email, otp });
  if (!sent) {
    return {
      ok: false,
      error: "Não conseguimos enviar o código. Tente novamente em instantes.",
    };
  }
  return { ok: true };
}

/** Etapa 2 do OTP: confere o código digitado (máx. 5 tentativas, comparação segura). */
export async function verifySignOtpAction(
  token: string,
  otp: string
): Promise<ActionResult> {
  const contract = await findPendingContract(token);
  if (!contract) return INVALID_LINK;

  if (contract.otpAttempts >= 5) {
    return { ok: false, error: "Muitas tentativas — solicite um novo código." };
  }
  if (!contract.otpHash || !contract.otpExpiry || contract.otpExpiry < new Date()) {
    return { ok: false, error: "Código expirado — solicite um novo código." };
  }

  const normalized = otp.replace(/\D/g, "");
  const valid =
    normalized.length === 6 &&
    safeEqualHex(hashToken(normalized), contract.otpHash);

  if (!valid) {
    await prisma.contract.update({
      where: { id: contract.id },
      data: { otpAttempts: { increment: 1 } },
    });
    return { ok: false, error: "Código incorreto. Confira o email e tente de novo." };
  }

  await prisma.contract.update({
    where: { id: contract.id },
    data: { otpVerified: true },
  });
  const { ip, userAgent } = await requestMeta();
  await prisma.contractAuditEvent.create({
    data: { contractId: contract.id, event: "OTP_VERIFIED", ip, userAgent },
  });
  return { ok: true };
}

/**
 * Etapa final do PARCEIRO: registra a assinatura dele e libera o acesso ao
 * portal imediatamente. O contrato fica em PARTNER_SIGNED aguardando a
 * contra-assinatura da Credios — só então o PDF final é gerado e as cópias
 * são enviadas (fluxo em src/lib/actions/admin-contracts.ts).
 */
export async function signContractAction(token: string): Promise<ActionResult> {
  const contract = await findPendingContract(token);
  if (!contract) return INVALID_LINK;

  if (!contract.otpVerified) {
    return { ok: false, error: "Confirme sua identidade com o código antes de assinar." };
  }
  if (!contract.pdfUnsigned) {
    return { ok: false, error: "Documento indisponível — contate a Credios." };
  }

  const { ip, userAgent } = await requestMeta();

  try {
    await prisma.$transaction(async (tx) => {
      // Revalida dentro da transação para impedir assinatura dupla
      const fresh = await tx.contract.findUniqueOrThrow({
        where: { id: contract.id },
        select: { status: true },
      });
      if (fresh.status === "SIGNED" || fresh.status === "PARTNER_SIGNED") {
        throw new Error("ALREADY_SIGNED");
      }

      const signedAt = new Date();
      await tx.contract.update({
        where: { id: contract.id },
        data: { status: "PARTNER_SIGNED", signedAt },
      });
      await tx.contractAuditEvent.createMany({
        data: [
          { contractId: contract.id, event: "SIGNED", ip, userAgent },
          { contractId: contract.id, event: "ADMIN_SIGN_REQUESTED" },
        ],
      });
      // Acesso liberado já na assinatura do parceiro
      await tx.partner.update({
        where: { id: contract.partnerId },
        data: { status: "ACTIVE" },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_SIGNED") {
      return { ok: true };
    }
    console.error("[contracts] falha ao assinar:", err);
    return {
      ok: false,
      error: "Não conseguimos concluir a assinatura. Tente novamente em instantes.",
    };
  }

  // Emails fora da transação (sendEmail nunca propaga exceção):
  // confirmação ao parceiro (sem PDF — ele chega após a contra-assinatura)
  // e pedido de assinatura ao admin da Credios.
  await sendPartnerSignedEmail({
    to: contract.partner.email,
    partnerName: contract.partner.legalName,
    verifyCode: contract.verifyCode,
  });
  await sendAdminCountersignEmail({
    contractId: contract.id,
    partnerName: contract.partner.legalName,
  });

  return { ok: true };
}
