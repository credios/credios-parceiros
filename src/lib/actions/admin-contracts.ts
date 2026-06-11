"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { buildSignedPdf } from "@/lib/contracts/pdf";
import { resendContract } from "@/lib/contracts/service";
import { CREDIOS } from "@/lib/credios";
import { formatDocument } from "@/lib/format";
import { sendContractSignedEmail } from "@/lib/email/templates";
import { toFieldErrors, type ActionState } from "@/lib/actions/admin-helpers";

const templateSchema = z.object({
  name: z.string().min(3, "Dê um nome à versão (ex.: Revisão jurídica jun/2026)."),
  bodyHtml: z.string().min(50, "O corpo do contrato parece vazio."),
});

export async function createTemplateAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireAdminSession();

  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    bodyHtml: formData.get("bodyHtml"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const template = await prisma.$transaction(async (tx) => {
    const max = await tx.contractTemplate.aggregate({ _max: { version: true } });
    const version = (max._max.version ?? 0) + 1;
    await tx.contractTemplate.updateMany({
      where: { active: true },
      data: { active: false },
    });
    return tx.contractTemplate.create({
      data: {
        version,
        name: parsed.data.name,
        bodyHtml: parsed.data.bodyHtml,
        active: true,
      },
    });
  });

  await logAdminAction({
    actorId: userId,
    action: "TEMPLATE_UPDATED",
    entity: "ContractTemplate",
    entityId: template.id,
    metadata: { version: template.version, name: template.name },
  });

  revalidatePath("/admin/contratos");
  redirect("/admin/contratos");
}

/**
 * Contra-assinatura da Credios. Pré-requisito: contrato em PARTNER_SIGNED.
 * Em transação: evento ADMIN_SIGNED (ip/ua do admin autenticado), PDF final
 * com os DOIS carimbos + manifesto, hash e status SIGNED. Fora dela: cópias
 * por email ao parceiro e à Credios. Idempotente: já SIGNED retorna ok.
 */
export async function adminSignContractAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireAdminSession();
  const contractId = String(formData.get("contractId") ?? "");
  if (!contractId) return { ok: false, error: "Contrato não identificado." };
  if (formData.get("accept") !== "on") {
    return {
      ok: false,
      error: "Confirme que leu e concorda com os termos antes de assinar.",
    };
  }

  const [contract, admin] = await Promise.all([
    prisma.contract.findUnique({
      where: { id: contractId },
      include: { partner: true },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true },
    }),
  ]);
  if (!contract) return { ok: false, error: "Contrato não encontrado." };
  if (contract.status === "SIGNED") {
    return { ok: true, message: "Este contrato já estava concluído." };
  }
  if (contract.status !== "PARTNER_SIGNED") {
    return {
      ok: false,
      error: "O parceiro ainda não assinou — a contra-assinatura vem depois.",
    };
  }
  if (!contract.pdfUnsigned || !contract.signedAt) {
    return { ok: false, error: "Documento indisponível — contate o suporte." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent");
  const unsignedPdf = new Uint8Array(contract.pdfUnsigned);
  const partnerSignedAt = contract.signedAt;

  let signedPdf: Uint8Array;
  try {
    signedPdf = await prisma.$transaction(async (tx) => {
      const fresh = await tx.contract.findUniqueOrThrow({
        where: { id: contract.id },
        select: { status: true },
      });
      if (fresh.status !== "PARTNER_SIGNED") throw new Error("ALREADY_SIGNED");

      const adminSignedAt = new Date();
      await tx.contractAuditEvent.create({
        data: {
          contractId: contract.id,
          event: "ADMIN_SIGNED",
          ip,
          userAgent,
          metadata: { adminId: userId, adminName: admin.name },
        },
      });

      const events = await tx.contractAuditEvent.findMany({
        where: { contractId: contract.id },
        orderBy: { createdAt: "asc" },
        select: { event: true, createdAt: true, ip: true, userAgent: true },
      });

      const { pdf, hash } = await buildSignedPdf({
        unsignedPdf,
        signers: [
          {
            role: "PARCEIRO(A)",
            name: contract.partner.legalName,
            document: formatDocument(contract.partner.document),
            email: contract.partner.email,
            signedAt: partnerSignedAt,
            verification: "email verificado por código OTP",
          },
          {
            role: "CREDIOS (CONTRATADA)",
            name: `${CREDIOS.razaoSocial}, por ${admin.name}`,
            document: CREDIOS.cnpj,
            email: admin.email,
            signedAt: adminSignedAt,
            verification: "administrador autenticado por email e senha",
          },
        ],
        events,
        verifyCode: contract.verifyCode,
      });

      await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: "SIGNED",
          adminSignedAt,
          adminSignerId: userId,
          adminSignerName: admin.name,
          pdfSigned: Buffer.from(pdf),
          documentHash: hash,
        },
      });
      return pdf;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_SIGNED") {
      return { ok: true, message: "Este contrato já estava concluído." };
    }
    console.error("[contracts] falha na contra-assinatura:", err);
    return {
      ok: false,
      error: "Não conseguimos concluir a assinatura. Tente novamente em instantes.",
    };
  }

  await logAdminAction({
    actorId: userId,
    action: "CONTRACT_ADMIN_SIGNED",
    entity: "Contract",
    entityId: contract.id,
    metadata: { partner: contract.partner.legalName },
  });

  // Cópias finais — só agora, com as duas assinaturas
  const recipients = [contract.partner.email];
  if (process.env.ADMIN_ALERT_EMAIL) recipients.push(process.env.ADMIN_ALERT_EMAIL);
  await sendContractSignedEmail({
    to: recipients,
    partnerName: contract.partner.legalName,
    verifyCode: contract.verifyCode,
    pdf: Buffer.from(signedPdf),
  });

  revalidatePath("/admin/contratos");
  return {
    ok: true,
    message: `Contrato de ${contract.partner.legalName} concluído — cópias enviadas por email.`,
  };
}

export async function resendContractAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId } = await requireAdminSession();
  const contractId = String(formData.get("contractId") ?? "");
  if (!contractId) return { ok: false, error: "Contrato não identificado." };

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { partner: { select: { legalName: true } } },
  });
  if (!contract) return { ok: false, error: "Contrato não encontrado." };
  if (contract.status === "SIGNED" || contract.status === "CANCELLED") {
    return { ok: false, error: "Este contrato não pode mais ser reenviado." };
  }

  try {
    await resendContract(contractId);
  } catch {
    return { ok: false, error: "Não foi possível reenviar o contrato agora." };
  }

  await logAdminAction({
    actorId: userId,
    action: "CONTRACT_RESENT",
    entity: "Contract",
    entityId: contractId,
  });

  revalidatePath("/admin/contratos");
  return {
    ok: true,
    message: `Link de assinatura reenviado para ${contract.partner.legalName}.`,
  };
}
