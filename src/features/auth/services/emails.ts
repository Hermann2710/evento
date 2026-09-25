import { absoluteUrl } from "@/lib/site";
import { renderEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { createUserToken } from "./tokens";

type MailUser = { id: string; email: string; firstName: string; locale: string };

export async function sendWelcomeEmail(user: MailUser): Promise<void> {
  const mail = renderEmail("welcome", user.locale, { name: user.firstName }, absoluteUrl(`/${user.locale}/discover`));
  await sendEmail({ to: user.email, ...mail });
}

export async function sendVerificationEmail(user: MailUser): Promise<void> {
  const token = await createUserToken(user.id, user.email, "email_verification");
  const url = absoluteUrl(`/${user.locale}/verify-email?token=${encodeURIComponent(token)}`);
  const mail = renderEmail("verification", user.locale, { name: user.firstName }, url);
  await sendEmail({ to: user.email, ...mail });
}

export async function sendPasswordResetEmail(user: MailUser): Promise<void> {
  const token = await createUserToken(user.id, user.email, "password_reset");
  const url = absoluteUrl(`/${user.locale}/reset-password?token=${encodeURIComponent(token)}`);
  const mail = renderEmail("passwordReset", user.locale, { name: user.firstName }, url);
  await sendEmail({ to: user.email, ...mail });
}
