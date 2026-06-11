import { renderEmailLayout } from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";
import { APP_URL, CREDIOS, PROGRAMA } from "@/lib/credios";
import { formatBRL, formatPercent } from "@/lib/format";
import { STATUS_META } from "@/lib/status";
import type { LeadStatus } from "@prisma/client";

/** 1. Convite do parceiro (+ reenvio). */
export async function sendInviteEmail(opts: {
  to: string;
  partnerName: string;
  token: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: "Você foi convidado para o Portal de Parceiros Credios",
    html: renderEmailLayout({
      eyebrow: "Programa de parcerias",
      title: `${opts.partnerName}, seja bem-vindo(a) à Credios`,
      bodyHtml: `
        <p>Você foi convidado para o Portal de Parceiros da Credios. Por lá, você indica clientes em menos de 2 minutos, acompanha cada etapa das operações em tempo real e visualiza suas comissões de ${formatPercent(PROGRAMA.comissaoPadrao)} sobre o crédito liberado.</p>
        <p>Para começar, crie sua senha de acesso. O link vale por 7 dias.</p>`,
      cta: { label: "Criar minha senha", url: `${APP_URL}/convite/${opts.token}` },
    }),
  });
}

/** 1b. Convite de GERENTE do programa (admin do portal). */
export async function sendManagerInviteEmail(opts: {
  to: string;
  managerName: string;
  token: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: "Seu acesso de gerente ao Portal de Parceiros Credios",
    html: renderEmailLayout({
      eyebrow: "Equipe Credios",
      title: `${opts.managerName}, seu acesso de gerente está pronto`,
      bodyHtml: `
        <p>Você foi cadastrado como gerente do programa de parcerias da Credios. Pelo painel, você cadastra e acompanha os parceiros da sua carteira, as indicações e a produção de cada um.</p>
        <p>Para começar, crie sua senha de acesso. O link vale por 7 dias.</p>`,
      cta: { label: "Criar minha senha", url: `${APP_URL}/convite/${opts.token}` },
    }),
  });
}

/** 2a. Contrato pronto para assinatura. */
export async function sendContractReadyEmail(opts: {
  to: string;
  partnerName: string;
  token: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: "Seu contrato de parceria Credios está pronto para assinatura",
    html: renderEmailLayout({
      eyebrow: "Contrato de parceria",
      title: "Falta só a assinatura",
      bodyHtml: `
        <p>${opts.partnerName}, seu contrato de parceria foi gerado com seus dados. A assinatura é 100% eletrônica: você lê o documento, confirma sua identidade com um código enviado por email e assina em poucos cliques.</p>
        <p>O link vale por 7 dias.</p>`,
      cta: { label: "Ler e assinar o contrato", url: `${APP_URL}/contrato/${opts.token}` },
    }),
  });
}

/** 2b. OTP de assinatura — entrega obrigatória (cheque o retorno). */
export async function sendOtpEmail(opts: { to: string; otp: string }) {
  return sendEmail({
    to: opts.to,
    subject: `${opts.otp} é seu código de assinatura Credios`,
    html: renderEmailLayout({
      eyebrow: "Confirmação de identidade",
      title: "Seu código de assinatura",
      bodyHtml: `
        <p>Use o código abaixo para confirmar sua identidade e assinar o contrato de parceria. Ele expira em 10 minutos.</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;padding:14px 28px;background:#EEF3FD;border-radius:14px;font-size:30px;font-weight:700;letter-spacing:0.35em;color:#142B52;font-variant-numeric:tabular-nums;">${opts.otp}</span>
        </div>
        <p style="font-size:13px;color:#8B8881;">Se você não estiver tentando assinar um contrato com a Credios, ignore este email.</p>`,
    }),
  });
}

/** 2c. Parceiro assinou — confirmação SEM PDF (a cópia vem após a contra-assinatura). */
export async function sendPartnerSignedEmail(opts: {
  to: string;
  partnerName: string;
  verifyCode: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: "Sua assinatura foi registrada — acesso liberado",
    html: renderEmailLayout({
      eyebrow: "Contrato de parceria",
      title: "Sua parte está assinada",
      bodyHtml: `
        <p>${opts.partnerName}, registramos sua assinatura eletrônica no contrato de parceria e <strong>seu acesso ao portal já está liberado</strong> — você já pode indicar clientes.</p>
        <p>Falta só a assinatura institucional da Credios. Assim que ela for concluída, você recebe por email a cópia final em PDF com a trilha de auditoria completa e as duas assinaturas.</p>
        <p>Código público de verificação: <strong>${opts.verifyCode}</strong></p>`,
      cta: { label: "Acessar o portal", url: `${APP_URL}/app` },
    }),
  });
}

/** 2d. Pedido de contra-assinatura ao admin da Credios. */
export async function sendAdminCountersignEmail(opts: {
  contractId: string;
  partnerName: string;
}) {
  const to = process.env.ADMIN_ALERT_EMAIL ?? CREDIOS.email;
  return sendEmail({
    to,
    subject: `Contrato de ${opts.partnerName} aguardando sua assinatura`,
    html: renderEmailLayout({
      eyebrow: "Assinador Credios",
      title: "Um contrato aguarda a assinatura da Credios",
      bodyHtml: `
        <p>O parceiro <strong>${opts.partnerName}</strong> acabou de assinar o contrato de parceria. Para concluir o documento, falta a assinatura institucional da Credios.</p>
        <p>O acesso do parceiro ao portal já foi liberado; a cópia final em PDF só será enviada às partes depois da sua assinatura.</p>`,
      cta: {
        label: "Revisar e assinar",
        url: `${APP_URL}/admin/contratos/${opts.contractId}/assinar`,
      },
    }),
  });
}

/** 2e. Contrato concluído — assinado por ambas as partes (com PDF anexo). */
export async function sendContractSignedEmail(opts: {
  to: string | string[];
  partnerName: string;
  verifyCode: string;
  pdf: Buffer;
}) {
  return sendEmail({
    to: opts.to,
    subject: "Contrato de parceria concluído — assinado por ambas as partes",
    html: renderEmailLayout({
      eyebrow: "Contrato de parceria",
      title: "Contrato assinado por ambas as partes",
      bodyHtml: `
        <p>O contrato de parceria de <strong>${opts.partnerName}</strong> foi assinado eletronicamente pelo parceiro e pela Credios. A cópia final em PDF está anexa, com os dois carimbos de assinatura e a trilha de auditoria completa.</p>
        <p>Código público de verificação: <strong>${opts.verifyCode}</strong><br/>
        Qualquer pessoa pode confirmar a autenticidade em <a href="${APP_URL}/verificar/${opts.verifyCode}" style="color:#4B7BE5;">parceiros.credios.com.br/verificar</a>.</p>`,
      cta: { label: "Acessar o portal", url: `${APP_URL}/app` },
    }),
    attachments: [
      { filename: "contrato-parceria-credios.pdf", content: opts.pdf },
    ],
  });
}

/** 3. Confirmação de indicação recebida. */
export async function sendLeadReceivedEmail(opts: {
  to: string;
  partnerName: string;
  clientName: string;
  leadId: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Recebemos a indicação de ${opts.clientName}`,
    html: renderEmailLayout({
      eyebrow: "Indicação recebida",
      title: `Indicação de ${opts.clientName} registrada`,
      bodyHtml: `
        <p>${opts.partnerName}, recebemos sua indicação. Nossa equipe entra em contato com o cliente em até 1 dia útil e você acompanha cada etapa pelo portal.</p>
        <p>O ciclo típico de uma operação de crédito com garantia de imóvel é de ${PROGRAMA.cicloTipicoDias} dias — avisaremos a cada marco importante.</p>`,
      cta: { label: "Acompanhar a operação", url: `${APP_URL}/app/clientes/${opts.leadId}` },
    }),
  });
}

/** 4. Mudança de status relevante (apenas marcos). */
export async function sendStatusChangeEmail(opts: {
  to: string;
  partnerName: string;
  clientName: string;
  leadId: string;
  status: LeadStatus;
}) {
  const meta = STATUS_META[opts.status];
  if (!meta.notifyPartner) return true;
  return sendEmail({
    to: opts.to,
    subject: `${opts.clientName}: ${meta.label.toLowerCase()}`,
    html: renderEmailLayout({
      eyebrow: "Atualização de operação",
      title: `${opts.clientName} — ${meta.label}`,
      bodyHtml: `<p>${meta.description}</p>
        <p>Acompanhe a linha do tempo completa no portal.</p>`,
      cta: { label: "Ver andamento", url: `${APP_URL}/app/clientes/${opts.leadId}` },
    }),
  });
}

/** 5a. Comissão gerada. */
export async function sendCommissionCreatedEmail(opts: {
  to: string;
  partnerName: string;
  clientName: string;
  amount: number | string;
  baseAmount: number | string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Sua comissão de ${formatBRL(opts.amount)} está a receber`,
    html: renderEmailLayout({
      eyebrow: "Comissão",
      title: "O crédito foi liberado — sua comissão foi gerada",
      bodyHtml: `
        <p>${opts.partnerName}, o crédito de ${formatBRL(opts.baseAmount)} indicado por você para <strong>${opts.clientName}</strong> foi liberado. Sua comissão já aparece no portal como a receber.</p>`,
      highlight: { label: "Comissão a receber", value: formatBRL(opts.amount) },
      cta: { label: "Ver minhas comissões", url: `${APP_URL}/app/comissoes` },
    }),
  });
}

/** 5b. Comissão paga. */
export async function sendCommissionPaidEmail(opts: {
  to: string;
  partnerName: string;
  clientName: string;
  amount: number | string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Comissão de ${formatBRL(opts.amount)} paga`,
    html: renderEmailLayout({
      eyebrow: "Comissão",
      title: "Pagamento realizado",
      bodyHtml: `
        <p>${opts.partnerName}, a comissão referente à operação de <strong>${opts.clientName}</strong> foi paga. O comprovante está disponível no portal.</p>`,
      highlight: { label: "Comissão paga", value: formatBRL(opts.amount) },
      cta: { label: "Ver extrato", url: `${APP_URL}/app/comissoes` },
    }),
  });
}

/** 6. Reset de senha. */
export async function sendPasswordResetEmail(opts: { to: string; token: string }) {
  return sendEmail({
    to: opts.to,
    subject: "Redefinição de senha — Portal de Parceiros Credios",
    html: renderEmailLayout({
      title: "Redefinir sua senha",
      bodyHtml: `
        <p>Recebemos um pedido para redefinir a senha da sua conta no Portal de Parceiros. O link vale por 1 hora.</p>
        <p style="font-size:13px;color:#8B8881;">Se não foi você, ignore este email — sua senha continua a mesma.</p>`,
      cta: { label: "Criar nova senha", url: `${APP_URL}/redefinir-senha/${opts.token}` },
    }),
  });
}

/** Alerta interno ao admin (duplicidade, falha de integração etc.). */
export async function sendAdminAlertEmail(opts: {
  subject: string;
  bodyHtml: string;
  ctaPath?: string;
}) {
  const to = process.env.ADMIN_ALERT_EMAIL ?? CREDIOS.email;
  return sendEmail({
    to,
    subject: `[Portal de Parceiros] ${opts.subject}`,
    html: renderEmailLayout({
      eyebrow: "Alerta interno",
      title: opts.subject,
      bodyHtml: opts.bodyHtml,
      cta: opts.ctaPath
        ? { label: "Abrir no painel", url: `${APP_URL}${opts.ctaPath}` }
        : undefined,
    }),
  });
}
