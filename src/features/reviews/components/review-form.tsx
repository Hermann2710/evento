"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/fields";
import { FormField, fieldAria } from "@/components/forms/form-field";
import { applyFieldErrors } from "@/components/forms/utils";
import { cn } from "@/lib/utils";
import { reviewSchema } from "../validations";
import { deleteReviewAction, upsertReviewAction } from "../actions";

type Props = { eventId: string; initial?: { id: string; rating: number; content: string } | null };

export function ReviewForm({ eventId, initial }: Props) {
  const t = useTranslations("reviews");
  const te = useTranslations("errors");
  const tv = useTranslations("validation");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setValue, watch, setError, formState: { errors } } = useForm({
    resolver: zodResolver(reviewSchema),
    defaultValues: { eventId, rating: initial?.rating ?? 0, content: initial?.content ?? "" },
  });
  const rating = watch("rating");

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const res = await upsertReviewAction(values);
      if (!res.ok) {
        applyFieldErrors(setError, res.fieldErrors);
        return void toast.error(te(res.error));
      }
      toast.success(initial ? t("updated") : t("created"));
      router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
      <fieldset>
        <legend className="mb-1 text-sm font-medium">{t("yourRating")}</legend>
        <div className="flex gap-1" role="radiogroup" aria-label={t("yourRating")}>
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="cursor-pointer">
              <input type="radio" name="rating-ui" value={value} checked={rating === value} onChange={() => setValue("rating", value, { shouldValidate: true })} className="peer sr-only" />
              <span className={cn("rounded text-2xl peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500", value <= rating ? "text-amber-400" : "text-gray-300")} aria-hidden="true">★</span>
              <span className="sr-only">{t("stars", { count: value })}</span>
            </label>
          ))}
        </div>
        {errors.rating && <p role="alert" className="mt-1 text-xs text-red-600">{tv("rating_range")}</p>}
      </fieldset>
      <FormField id="review-content" label={t("yourReview")} error={errors.content?.message}>
        <Textarea rows={3} {...fieldAria("review-content", errors.content?.message)} {...register("content")} />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>{initial ? t("update") : t("submit")}</Button>
        {initial && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => startTransition(async () => {
              const res = await deleteReviewAction(initial.id);
              if (!res.ok) return void toast.error(te(res.error));
              toast.success(t("deleted"));
              router.refresh();
            })}
          >
            {t("delete")}
          </Button>
        )}
      </div>
    </form>
  );
}
