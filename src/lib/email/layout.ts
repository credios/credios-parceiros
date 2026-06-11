import { APP_URL, CREDIOS } from "@/lib/credios";

interface EmailLayoutOptions {
  eyebrow?: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  /** Bloco de destaque dourado (comissões). */
  highlight?: { label: string; value: string };
  footerNote?: string;
}

/**
 * Layout base dos emails transacionais — HTML inline-styled, mobile-first,
 * mesma linguagem visual do CRM (crm.credios.com.br) e do site.
 */
export function renderEmailLayout(opts: EmailLayoutOptions): string {
  const cta = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 8px;">
        <tr><td style="border-radius:999px;background:#4B7BE5;">
          <a href="${opts.cta.url}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">
            ${opts.cta.label}
          </a>
        </td></tr>
      </table>`
    : "";

  const highlight = opts.highlight
    ? `<div style="margin:24px 0;padding:20px 24px;background:#FBF6EC;border:1px solid #E2C281;border-radius:14px;text-align:center;">
        <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#A07930;font-weight:600;">${opts.highlight.label}</div>
        <div style="font-size:32px;font-weight:700;color:#141E30;margin-top:6px;font-variant-numeric:tabular-nums;">${opts.highlight.value}</div>
      </div>`
    : "";

  const eyebrow = opts.eyebrow
    ? `<div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#D4A351;font-weight:600;margin-bottom:10px;">${opts.eyebrow}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F6F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F6F0;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 8px 20px;">
          <img src="${APP_URL}/credios-logo.png" alt="Credios" height="32" style="height:32px;width:auto;" />
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:20px;padding:36px 32px;border:1px solid rgba(20,30,48,0.06);">
          ${eyebrow}
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#141E30;font-weight:700;">${opts.title}</h1>
          <div style="font-size:15px;line-height:1.65;color:#46443F;">${opts.bodyHtml}</div>
          ${highlight}
          ${cta}
        </td></tr>
        <tr><td style="padding:24px 8px;text-align:center;">
          <div style="font-size:12px;line-height:1.6;color:#8B8881;">
            ${opts.footerNote ?? `Portal de Parceiros Credios — <a href="${APP_URL}" style="color:#4B7BE5;text-decoration:none;">parceiros.credios.com.br</a>`}<br/>
            ${CREDIOS.razaoSocial} · CNPJ ${CREDIOS.cnpj}<br/>
            ${CREDIOS.endereco}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
