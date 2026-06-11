import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "Credios Parceiros <parceiros@credios.com.br>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "parceiros@credios.com.br";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

/**
 * Envia email via Resend. Nunca propaga exceção (email não pode quebrar o
 * fluxo do usuário) — retorna false em caso de falha e loga no console.
 * Para fluxos onde a entrega é obrigatória (OTP), cheque o retorno.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY ausente — email "${opts.subject}" não enviado.`);
    return false;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
    if (error) {
      console.error(`[email] Falha ao enviar "${opts.subject}":`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] Erro ao enviar "${opts.subject}":`, err);
    return false;
  }
}
