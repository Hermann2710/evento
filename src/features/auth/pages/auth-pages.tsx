import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { isGoogleEnabled } from "@/lib/auth";
import { getCurrentUser, requireUser } from "@/lib/auth/guards";
import { buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/display";
import { AuthFooter, AuthHeading, OAuthButtons } from "../components/auth-card";
import { LoginForm } from "../components/login-form";
import { RegisterForm } from "../components/register-form";
import { ForgotPasswordForm, ResendVerificationButton, ResetPasswordForm } from "../components/password-forms";
import { verifyEmailToken } from "../services/tokens";

async function redirectIfAuthenticated() {
  const user = await getCurrentUser();
  if (user) {
    const locale = await getLocale();
    redirect({ href: "/", locale });
  }
}

function safeCallback(value?: string): string | undefined {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

export async function LoginPage({ callbackUrl }: { callbackUrl?: string }) {
  await redirectIfAuthenticated();
  const t = await getTranslations("auth");
  return (
    <>
      <AuthHeading title={t("loginTitle")} description={t("loginSubtitle")} />
      <OAuthButtons enabled={isGoogleEnabled} />
      <LoginForm callbackUrl={safeCallback(callbackUrl)} />
      <AuthFooter>
        {t("noAccount")}{" "}
        <Link href="/register" className="font-semibold text-brand-700 hover:underline">{t("registerLink")}</Link>
      </AuthFooter>
    </>
  );
}

export async function RegisterPage() {
  await redirectIfAuthenticated();
  const t = await getTranslations("auth");
  return (
    <>
      <AuthHeading title={t("registerTitle")} description={t("registerSubtitle")} />
      <OAuthButtons enabled={isGoogleEnabled} />
      <RegisterForm />
      <AuthFooter>
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">{t("loginLink")}</Link>
      </AuthFooter>
    </>
  );
}

export async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <>
      <AuthHeading title={t("forgotTitle")} description={t("forgotSubtitle")} />
      <ForgotPasswordForm />
      <AuthFooter>
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">{t("backToLogin")}</Link>
      </AuthFooter>
    </>
  );
}

export async function ResetPasswordPage({ token }: { token?: string }) {
  const t = await getTranslations("auth");
  if (!token) {
    return (
      <>
        <AuthHeading title={t("resetTitle")} description={t("invalidLink")} />
        <Link href="/forgot-password" className={buttonClass({ className: "w-full" })}>{t("requestNewLink")}</Link>
      </>
    );
  }
  return (
    <>
      <AuthHeading title={t("resetTitle")} description={t("resetSubtitle")} />
      <ResetPasswordForm token={token} />
    </>
  );
}

export async function VerifyEmailPage({ token }: { token?: string }) {
  const t = await getTranslations("auth");
  const user = await getCurrentUser();
  const verified = token ? await verifyEmailToken(token) : false;
  return (
    <div className="text-center">
      <p aria-hidden="true" className="text-5xl">{verified ? "✅" : "✉️"}</p>
      <AuthHeading
        title={verified ? t("verifiedTitle") : t("verifyTitle")}
        description={verified ? t("verifiedDescription") : token ? t("verifyInvalid") : t("verifyDescription")}
      />
      <div className="flex flex-col items-center gap-3">
        {!verified && user && !user.isEmailVerified && <ResendVerificationButton />}
        <Link href="/" className={buttonClass({ className: "w-full" })}>{t("continueToEvento")}</Link>
      </div>
    </div>
  );
}

export async function WelcomePage() {
  const user = await requireUser();
  const t = await getTranslations("auth");
  return (
    <div className="text-center">
      <p aria-hidden="true" className="text-5xl">🎉</p>
      <AuthHeading title={t("welcomeTitle", { name: user.firstName })} description={t("welcomeDescription")} />
      <div className="mb-6 flex items-center justify-center gap-2 text-sm">
        <span>{t("emailStatus")}</span>
        <Badge tone={user.isEmailVerified ? "green" : "yellow"}>
          {user.isEmailVerified ? t("verified") : t("unverified")}
        </Badge>
      </div>
      {!user.isEmailVerified && (
        <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          <p className="mb-3">{t("verificationPending")}</p>
          <ResendVerificationButton />
        </div>
      )}
      <div className="grid gap-3">
        <Link href="/discover" className={buttonClass()}>{t("startExploring")}</Link>
        <Link href="/onboarding" className={buttonClass({ variant: "outline" })}>{t("becomeOrganizer")}</Link>
      </div>
    </div>
  );
}
