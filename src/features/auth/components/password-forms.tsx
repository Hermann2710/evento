"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField, fieldAria } from "@/components/forms/form-field";
import { applyFieldErrors } from "@/components/forms/utils";
import { forgotPasswordSchema, resetPasswordSchema } from "../validations/auth";
import { forgotPasswordAction, resendVerificationAction, resetPasswordAction } from "../actions/auth-actions";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  if (sent) {
    return (
      <div role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
        {t("forgotSent")}
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const res = await forgotPasswordAction(values);
          if (!res.ok) return void toast.error(te(res.error));
          setSent(true);
        }),
      )}
    >
      <FormField id="email" label={t("email")} error={errors.email?.message} required>
        <Input type="email" autoComplete="email" {...fieldAria("email", errors.email?.message)} {...register("email")} />
      </FormField>
      <Button type="submit" className="w-full" loading={pending}>
        {t("forgotButton")}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const res = await resetPasswordAction(values);
          if (!res.ok) {
            applyFieldErrors(setError, res.fieldErrors);
            return void toast.error(te(res.error));
          }
          toast.success(t("resetSuccess"));
          router.push("/login");
        }),
      )}
    >
      <input type="hidden" {...register("token")} />
      <FormField id="password" label={t("newPassword")} error={errors.password?.message} hint={t("passwordHint")} required>
        <PasswordInput autoComplete="new-password" {...fieldAria("password", errors.password?.message)} {...register("password")} />
      </FormField>
      <FormField id="confirmPassword" label={t("confirmPassword")} error={errors.confirmPassword?.message} required>
        <PasswordInput autoComplete="new-password" {...fieldAria("confirmPassword", errors.confirmPassword?.message)} {...register("confirmPassword")} />
      </FormField>
      <Button type="submit" className="w-full" loading={pending}>
        {t("resetButton")}
      </Button>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-brand-700 hover:underline">{t("requestNewLink")}</Link>
      </p>
    </form>
  );
}

export function ResendVerificationButton() {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await resendVerificationAction();
          if (res.ok) toast.success(t("verificationResent"));
          else toast.error(te(res.error));
        })
      }
    >
      {t("resendVerification")}
    </Button>
  );
}
