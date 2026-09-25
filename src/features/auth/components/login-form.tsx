"use client";

import { useTransition } from "react";
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
import { loginSchema } from "../validations/auth";
import { loginAction } from "../actions/auth-actions";
import { OAuthButtons } from "./auth-card";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const res = await loginAction(values);
      if (!res.ok) {
        applyFieldErrors(setError, res.fieldErrors);
        toast.error(te(res.error));
        return;
      }
      toast.success(t("loginSuccess"));
      router.push(callbackUrl ?? "/");
      router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField id="email" label={t("email")} error={errors.email?.message} required>
        <Input type="email" autoComplete="email" placeholder={t("emailPlaceholder")} {...fieldAria("email", errors.email?.message)} {...register("email")} />
      </FormField>
      <FormField id="password" label={t("password")} error={errors.password?.message} required>
        <PasswordInput autoComplete="current-password" {...fieldAria("password", errors.password?.message)} {...register("password")} />
      </FormField>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
          {t("forgotLink")}
        </Link>
      </div>
      <Button type="submit" className="w-full" loading={pending}>
        {pending ? t("loggingIn") : t("loginButton")}
      </Button>
    </form>
  );
}
