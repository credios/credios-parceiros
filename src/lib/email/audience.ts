import { Resend } from "resend";

/**
 * Lista de newsletter no Resend — a MESMA audience usada pelo CRM e pelo
 * formulário do site (env RESEND_NEWSLETTER_AUDIENCE_ID). Todo parceiro
 * entra nela ao ser cadastrado. Nunca propaga exceção.
 */
export async function addPartnerToAudience(opts: {
  name: string;
  email: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_NEWSLETTER_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    console.warn("[audience] RESEND_NEWSLETTER_AUDIENCE_ID ausente — contato não adicionado.");
    return;
  }
  try {
    const resend = new Resend(apiKey);
    const parts = opts.name.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
    const { error } = await resend.contacts.create({
      audienceId,
      email: opts.email.toLowerCase().trim(),
      firstName,
      lastName,
      unsubscribed: false,
    });
    // Contato já existente não é erro relevante
    if (error) console.warn("[audience] contacts.create:", error.message);
  } catch (err) {
    console.error("[audience] falha ao adicionar contato:", err);
  }
}
