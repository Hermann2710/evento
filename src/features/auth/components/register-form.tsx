"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField, fieldAria } from "@/components/forms/form-field";
import { applyFieldErrors } from "@/components/forms/utils";
import { registerSchema } from "../validations/auth";
import { registerAction } from "../actions/auth-actions";

export function RegisterForm() {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phoneNumber: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const res = await registerAction(values);
      if (!res.ok) {
        applyFieldErrors(setError, res.fieldErrors);
        toast.error(te(res.error));
        return;
      }
      toast.success(t("registerSuccess"));
      router.push("/welcome");
      router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="firstName" label={t("firstName")} error={errors.firstName?.message} required>
          <Input autoComplete="given-name" {...fieldAria("firstName", errors.firstName?.message)} {...register("firstName")} />
        </FormField>
        <FormField id="lastName" label={t("lastName")} error={errors.lastName?.message} required>
          <Input autoComplete="family-name" {...fieldAria("lastName", errors.lastName?.message)} {...register("lastName")} />
        </FormField>
      </div>
      <FormField id="email" label={t("email")} error={errors.email?.message} required>
        <Input type="email" autoComplete="email" placeholder={t("emailPlaceholder")} {...fieldAria("email", errors.email?.message)} {...register("email")} />
      </FormField>
      <FormField id="phoneNumber" label={t("phoneNumber")} error={errors.phoneNumber?.message} hint={t("phoneHint")}>
        <Input type="tel" autoComplete="tel" placeholder="+237 6 00 00 00 00" {...fieldAria("phoneNumber", errors.phoneNumber?.message)} {...register("phoneNumber")} />
      </FormField>
      <FormField id="password" label={t("password")} error={errors.password?.message} hint={t("passwordHint")} required>
        <PasswordInput autoComplete="new-password" {...fieldAria("password", errors.password?.message)} {...register("password")} />
      </FormField>
      <FormField id="confirmPassword" label={t("confirmPassword")} error={errors.confirmPassword?.message} required>
        <PasswordInput autoComplete="new-password" {...fieldAria("confirmPassword", errors.confirmPassword?.message)} {...register("confirmPassword")} />
      </FormField>
      <Button type="submit" className="w-full" loading={pending}>
        {pending ? t("registering") : t("registerButton")}
      </Button>
    </form>
  );
}
