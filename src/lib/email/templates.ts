import { translate } from "@/lib/i18n/translate";

export type EmailTemplate =
  | "welcome"
  | "verification"
  | "passwordReset"
  | "bookingConfirmation"
  | "paymentConfirmation"
  | "ticketDelivery"
  | "eventNotification";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Renders an internationalized transactional email (subject / heading / body / cta keys). */
export function renderEmail(
  template: EmailTemplate,
  locale: string,
  params: Record<string, string | number>,
  ctaUrl?: string,
): { subject: string; html: string; text: string } {
  const t = (key: string) => translate(locale, `emails.${template}.${key}`, params);
  const subject = t("subject");
  const heading = t("heading");
  const body = t("body");
  const cta = ctaUrl ? t("cta") : null;
  const footer = translate(locale, "emails.footer");

  const button = cta && ctaUrl
    ? `<p style="margin:28px 0"><a href="${escapeHtml(ctaUrl)}" style="background:#7c3aed;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">${escapeHtml(cta)}</a></p>`
    : "";

  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:#f5f3ff;font-family:Arial,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:32px">
<tr><td><p style="font-size:22px;font-weight:800;color:#7c3aed;margin:0 0 20px">Evento</p>
<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(heading)}</h1>
<p style="font-size:15px;line-height:1.6;margin:0">${escapeHtml(body)}</p>
${button}
<p style="font-size:12px;color:#6b7280;margin-top:32px">${escapeHtml(footer)}</p></td></tr></table></td></tr></table></body></html>`;

  const text = [heading, "", body, ctaUrl ? `\n${cta}: ${ctaUrl}` : "", "", footer].join("\n");
  return { subject, html, text };
}
