"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { saveCategoryAction } from "../actions";

export function CategoryForm({ category }: { category?: { id: string; name: string; description: string | null } }) {
  const t = useTranslations("admin.categories");
  const te = useTranslations("errors");
  const tv = useTranslations("validation");
  const router = useRouter();
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const idp = category?.id ?? "new";

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-start"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveCategoryAction(category?.id ?? null, { name, description });
          if (!res.ok) {
            setError(res.fieldErrors?.name ?? null);
            return void toast.error(te(res.error));
          }
          setError(null);
          toast.success(t("saved"));
          if (!category) { setName(""); setDescription(""); }
          router.refresh();
        });
      }}
    >
      <div className="flex-1">
        <label htmlFor={`cat-name-${idp}`} className="sr-only">{t("name")}</label>
        <Input id={`cat-name-${idp}`} placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={error ? true : undefined} />
        {error && <p role="alert" className="mt-1 text-xs text-red-600">{tv.has(error) ? tv(error) : tv("invalid")}</p>}
      </div>
      <div className="flex-1">
        <label htmlFor={`cat-desc-${idp}`} className="sr-only">{t("description")}</label>
        <Input id={`cat-desc-${idp}`} placeholder={t("description")} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <Button type="submit" size="md" loading={pending}>{category ? t("save") : t("add")}</Button>
    </form>
  );
}
