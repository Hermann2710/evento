"use server";

import { AuthError } from "next-auth";
import { eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { signIn, signOut } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/password";
import { limitByIp, rateLimit } from "@/lib/rate-limit";
import { fail, ok, toFieldErrors, type ActionResult, type ErrorCode } from "@/lib/result";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validations/auth";
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from "../services/emails";
import { consumeUserToken } from "../services/tokens";

const AUTH_CODES: ErrorCode[] = ["invalid_credentials", "account_banned", "account_suspended", "rate_limited"];

async function credentialsSignIn(email: string, password: string): Promise<ActionResult> {
  try {
    await signIn("credentials", { email, password, redirect: false });
    return ok();
  } catch (error) {
    if (error instanceof AuthError) {
      const code = (error as AuthError & { code?: string }).code as ErrorCode | undefined;
      return fail(code && AUTH_CODES.includes(code) ? code : "invalid_credentials");
    }
    throw error;
  }
}

export async function registerAction(values: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) return fail("invalid_input", toFieldErrors(parsed.error.issues));
  if (!(await limitByIp("register", 5, 60 * 60_000))) return fail("rate_limited");

  const data = parsed.data;
  const email = data.email.toLowerCase();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return fail("email_taken", { email: "email_taken" });

  const locale = await getLocale();
  const [user] = await db
    .insert(users)
    .values({
      firstName: data.firstName,
      lastName: data.lastName,
      email,
      phoneNumber: data.phoneNumber || null,
      passwordHash: await hashPassword(data.password),
      locale,
    })
    .onConflictDoNothing()
    .returning({ id: users.id, email: users.email, firstName: users.firstName, locale: users.locale });
  if (!user) return fail("email_taken", { email: "email_taken" });

  // Verification is sent but never blocks account usage.
  await Promise.allSettled([sendWelcomeEmail(user), sendVerificationEmail(user)]);
  return credentialsSignIn(email, data.password);
}

export async function loginAction(values: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return fail("invalid_input", toFieldErrors(parsed.error.issues));
  if (!(await limitByIp("login", 30, 15 * 60_000))) return fail("rate_limited");
  return credentialsSignIn(parsed.data.email.toLowerCase(), parsed.data.password);
}

export async function logoutAction(): Promise<ActionResult> {
  await signOut({ redirect: false });
  return ok();
}

export async function forgotPasswordAction(values: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return fail("invalid_input", toFieldErrors(parsed.error.issues));
  const email = parsed.data.email.toLowerCase();
  if (!(await limitByIp("forgot", 10, 60 * 60_000)) || !rateLimit(`forgot:${email}`, 3, 60 * 60_000).ok) {
    return fail("rate_limited");
  }
  const [user] = await db
    .select({ id: users.id, email: users.email, firstName: users.firstName, locale: users.locale, status: users.status })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (user && user.status !== "banned") await sendPasswordResetEmail(user);
  // Same response whether the account exists or not (no user enumeration).
  return ok();
}

export async function resetPasswordAction(values: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) return fail("invalid_input", toFieldErrors(parsed.error.issues));
  if (!(await limitByIp("reset", 10, 60 * 60_000))) return fail("rate_limited");
  const row = await consumeUserToken(parsed.data.token, "password_reset");
  if (!row) return fail("invalid_token");
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.password) })
    .where(eq(users.id, row.userId));
  return ok();
}

export async function resendVerificationAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  if (user.isEmailVerified) return ok();
  if (!rateLimit(`verify:${user.id}`, 3, 60 * 60_000).ok) return fail("rate_limited");
  await sendVerificationEmail(user);
  return ok();
}
