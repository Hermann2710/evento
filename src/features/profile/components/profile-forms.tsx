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
import { ImageUpload } from "@/components/forms/image-upload";
import { applyFieldErrors } from "@/components/forms/utils";
import { changePasswordSchema, profileSchema, type ProfileInput } from "../validations";
import { changePasswordAction, updateProfileAction } from "../actions";

export function ProfileForm({ initial }: { initial: ProfileInput }) {
  const t = useTranslations("profile");
  const te = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: initial,
  });
  const image = watch("image");

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const res = await updateProfileAction(values);
          if (!res.ok) {
            applyFieldErrors(setError, res.fieldErrors);
            return void toast.error(te(res.error));
          }
          toast.success(t("saved"));
          router.refresh();
        }),
      )}
    >
      <div>
        <p className="mb-1.5 text-sm font-medium">{t("avatar")}</p>
        <ImageUpload label={t("avatar")} value={image || null} onChange={(url) => setValue("image", url ?? "", { shouldDirty: true })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="p-first" label={t("firstName")} error={errors.firstName?.message} required>
          <Input autoComplete="given-name" {...fieldAria("p-first", errors.firstName?.message)} {...register("firstName")} />
        </FormField>
        <FormField id="p-last" label={t("lastName")} error={errors.lastName?.message} required>
          <Input autoComplete="family-name" {...fieldAria("p-last", errors.lastName?.message)} {...register("lastName")} />
        </FormField>
      </div>
      <FormField id="p-phone" label={t("phoneNumber")} error={errors.phoneNumber?.message}>
        <Input type="tel" autoComplete="tel" {...fieldAria("p-phone", errors.phoneNumber?.message)} {...register("phoneNumber")} />
      </FormField>
      <Button type="submit" loading={pending}>{t("save")}</Button>
    </form>
  );
}

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const t = useTranslations("profile");
  const te = useTranslations("errors");
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const res = await changePasswordAction(values);
          if (!res.ok) {
            applyFieldErrors(setError, res.fieldErrors);
            return void toast.error(te(res.error));
          }
          toast.success(t("passwordChanged"));
          reset();
        }),
      )}
    >
      {hasPassword && (
        <FormField id="cp-current" label={t("currentPassword")} error={errors.currentPassword?.message} required>
          <PasswordInput autoComplete="current-password" {...fieldAria("cp-current", errors.currentPassword?.message)} {...register("currentPassword")} />
        </FormField>
      )}
      <FormField id="cp-new" label={t("newPassword")} error={errors.newPassword?.message} required>
        <PasswordInput autoComplete="new-password" {...fieldAria("cp-new", errors.newPassword?.message)} {...register("newPassword")} />
      </FormField>
      <FormField id="cp-confirm" label={t("confirmPassword")} error={errors.confirmPassword?.message} required>
        <PasswordInput autoComplete="new-password" {...fieldAria("cp-confirm", errors.confirmPassword?.message)} {...register("confirmPassword")} />
      </FormField>
      <Button type="submit" loading={pending}>{t("changePassword")}</Button>
    </form>
  );
}
