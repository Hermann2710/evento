"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/fields";
import { FormField, fieldAria } from "@/components/forms/form-field";
import { ImageUpload } from "@/components/forms/image-upload";
import { applyFieldErrors } from "@/components/forms/utils";
import { organizerProfileSchema, type OrganizerProfileInput } from "../validations";
import { saveOrganizerProfileAction } from "../actions";

export function OrganizerProfileForm({ initial, redirectTo }: { initial?: OrganizerProfileInput; redirectTo?: string }) {
  const t = useTranslations("organizer.profile");
  const te = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm({
    resolver: zodResolver(organizerProfileSchema),
    defaultValues: initial ?? { name: "", description: "", website: "", image: "" },
  });
  const image = watch("image");

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const res = await saveOrganizerProfileAction(values);
          if (!res.ok) {
            applyFieldErrors(setError, res.fieldErrors);
            return void toast.error(te(res.error));
          }
          toast.success(t("saved"));
          if (redirectTo) router.push(redirectTo);
          router.refresh();
        }),
      )}
    >
      <FormField id="org-name" label={t("name")} error={errors.name?.message} required>
        <Input {...fieldAria("org-name", errors.name?.message)} {...register("name")} />
      </FormField>
      <FormField id="org-description" label={t("description")} error={errors.description?.message}>
        <Textarea rows={4} {...fieldAria("org-description", errors.description?.message)} {...register("description")} />
      </FormField>
      <FormField id="org-website" label={t("website")} error={errors.website?.message}>
        <Input type="url" placeholder="https://" {...fieldAria("org-website", errors.website?.message)} {...register("website")} />
      </FormField>
      <div>
        <p className="mb-1.5 text-sm font-medium">{t("logo")}</p>
        <ImageUpload label={t("logo")} value={image || null} onChange={(url) => setValue("image", url ?? "")} />
      </div>
      <Button type="submit" loading={pending}>{t("save")}</Button>
    </form>
  );
}
