"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { generateOtp, hashToken, safeEqualHex } from "@/lib/tokens";
import { buildSignedPdf } from "@/lib/contracts/pdf";
import { formatDocument } from "@/lib/format";
import {
  sendContractSignedEmail,
  sendOtpEmail,
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
 * Etapa final: assina o contrato. Em transação: status SIGNED, evento de
 * auditoria, PDF assinado (carimbo + manifesto), hash final e ativação do
 * parceiro. Fora da transação: emails com o PDF anexo.
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
  const unsignedPdf = new Uint8Array(contract.pdfUnsigned);

  let signedPdf: Uint8Array;
  try {
    signedPdf = await prisma.$transaction(async (tx) => {
      // Revalida dentro da transação para impedir assinatura dupla
      const fresh = await tx.contract.findUniqueOrThrow({
        where: { id: contract.id },
        select: { status: true },
      });
      if (fresh.status === "SIGNED") {
        throw new Error("ALREADY_SIGNED");
      }

      const signedAt = new Date();
      await tx.contract.update({
        where: { id: contract.id },
        data: { status: "SIGNED", signedAt },
      });
      await tx.contractAuditEvent.create({
        data: { contractId: contract.id, event: "SIGNED", ip, userAgent },
      });

      const events = await tx.contractAuditEvent.findMany({
        where: { contractId: contract.id },
        orderBy: { createdAt: "asc" },
        select: { event: true, createdAt: true, ip: true, userAgent: true },
      });

      const { pdf, hash } = await buildSignedPdf({
        unsignedPdf,
        signer: {
          name: contract.partner.legalName,
          document: formatDocument(contract.partner.document),
          email: contract.partner.email,
        },
        events,
        verifyCode: contract.verifyCode,
      });

      await tx.contract.update({
        where: { id: contract.id },
        data: { pdfSigned: Buffer.from(pdf), documentHash: hash },
      });
      await tx.partner.update({
        where: { id: contract.partnerId },
        data: { status: "ACTIVE" },
      });
      return pdf;
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

  // Emails fora da transação (sendEmail nunca propaga exceção)
  const recipients = [contract.partner.email];
  if (process.env.ADMIN_ALERT_EMAIL) recipients.push(process.env.ADMIN_ALERT_EMAIL);
  await sendContractSignedEmail({
    to: recipients,
    partnerName: contract.partner.legalName,
    verifyCode: contract.verifyCode,
    pdf: Buffer.from(signedPdf),
  });

  return { ok: true };
}
