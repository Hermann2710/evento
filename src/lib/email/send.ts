import { Resend } from "resend";

export type EmailMessage = { to: string; subject: string; html: string; text: string };

let client: Resend | null = null;

/** Sends an email through Resend. Falls back to console logging in development. Never throws. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email:dev] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return true;
  }
  try {
    client ??= new Resend(key);
    const { error } = await client.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Evento <onboarding@resend.dev>",
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (error) {
      console.error("[email] send failed", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] send failed", error);
    return false;
  }
}
