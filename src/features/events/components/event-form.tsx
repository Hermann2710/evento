"use client";

import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import { Input, Select, Textarea } from "@/components/ui/fields";
import { ImagePreview } from "@/components/ui/smart-image";
import { FormField, fieldAria } from "@/components/forms/form-field";
import { ImageUpload } from "@/components/forms/image-upload";
import { applyFieldErrors } from "@/components/forms/utils";
import { SUPPORTED_CURRENCIES } from "@/lib/pricing";
import { eventFormSchema, TIMEZONES, type EventFormValues } from "../validations/event-form";
import { createEventAction, updateEventAction } from "../actions/event-actions";

type Props = {
  categories: Array<{ id: string; name: string }>;
  initial?: EventFormValues;
  eventId?: string;
};

const emptyTicket = { id: "", name: "", description: "", price: 0, quantity: 100, salesStart: "", salesEnd: "" };

export function EventForm({ categories, initial, eventId }: Props) {
  const t = useTranslations("eventForm");
  const te = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, control, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm({
    resolver: zodResolver(eventFormSchema),
    defaultValues: initial ?? {
      title: "", description: "", categoryId: "", coverImage: "", gallery: [], location: "", city: "", country: "",
      startDate: "", endDate: "", timezone: "Africa/Douala", capacity: 100, currency: "XAF", ticketTypes: [emptyTicket],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "ticketTypes" });
  const coverImage = watch("coverImage");
  const gallery = watch("gallery");

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const res = eventId ? await updateEventAction(eventId, values) : await createEventAction(values);
      if (!res.ok) {
        applyFieldErrors(setError, res.fieldErrors);
        return void toast.error(te(res.error));
      }
      toast.success(eventId ? t("updated") : t("created"));
      router.push("/organizer/events");
      router.refresh();
    }),
    () => toast.error(t("fixErrors")),
  );

  const err = (path: string) => {
    const parts = path.split(".");
    let node: unknown = errors;
    for (const p of parts) node = node && typeof node === "object" ? (node as Record<string, unknown>)[p] : undefined;
    return (node as { message?: string } | undefined)?.message;
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">{t("general")}</h2>
        <FormField id="title" label={t("title")} error={err("title")} required>
          <Input {...fieldAria("title", err("title"))} {...register("title")} />
        </FormField>
        <FormField id="description" label={t("description")} error={err("description")} required>
          <Textarea rows={6} {...fieldAria("description", err("description"))} {...register("description")} />
        </FormField>
        <FormField id="categoryId" label={t("category")} error={err("categoryId")} required>
          <Select {...fieldAria("categoryId", err("categoryId"))} {...register("categoryId")}>
            <option value="">{t("chooseCategory")}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </FormField>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">{t("media")}</h2>
        <div>
          <p className="mb-1.5 text-sm font-medium">{t("coverImage")}</p>
          <ImageUpload id="coverImage" label={t("coverImage")} value={coverImage || null} onChange={(url) => setValue("coverImage", url ?? "", { shouldDirty: true })} />
          {err("coverImage") && <p role="alert" className="mt-1 text-xs text-red-600">{te("invalid_image")}</p>}
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">{t("gallery")}</p>
          {gallery.length > 0 && (
            <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {gallery.map((url, i) => (
                <li key={url + i} className="relative">
                  <ImagePreview src={url} alt={t("galleryImage", { index: i + 1 })} className="aspect-square" />
                  <button type="button" onClick={() => setValue("gallery", gallery.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-white/90 px-2 text-sm shadow" aria-label={t("removeImage", { index: i + 1 })}>✕</button>
                </li>
              ))}
            </ul>
          )}
          {gallery.length < 8 && <ImageUpload label={t("addGalleryImage")} value={null} onChange={(url) => url && setValue("gallery", [...gallery, url])} />}
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">{t("whereWhen")}</h2>
        <FormField id="location" label={t("location")} error={err("location")} required>
          <Input {...fieldAria("location", err("location"))} {...register("location")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="city" label={t("city")} error={err("city")} required>
            <Input {...fieldAria("city", err("city"))} {...register("city")} />
          </FormField>
          <FormField id="country" label={t("country")} error={err("country")} required>
            <Input {...fieldAria("country", err("country"))} {...register("country")} />
          </FormField>
          <FormField id="startDate" label={t("startDate")} error={err("startDate")} required>
            <Input type="datetime-local" {...fieldAria("startDate", err("startDate"))} {...register("startDate")} />
          </FormField>
          <FormField id="endDate" label={t("endDate")} error={err("endDate")} required>
            <Input type="datetime-local" {...fieldAria("endDate", err("endDate"))} {...register("endDate")} />
          </FormField>
          <FormField id="timezone" label={t("timezone")} error={err("timezone")} required>
            <Select {...fieldAria("timezone", err("timezone"))} {...register("timezone")}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </Select>
          </FormField>
          <FormField id="capacity" label={t("capacity")} error={err("capacity")} hint={t("capacityHint")} required>
            <Input type="number" min={1} {...fieldAria("capacity", err("capacity"))} {...register("capacity", { valueAsNumber: true })} />
          </FormField>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("ticketTypes")}</h2>
          <div className="w-32">
            <label htmlFor="currency" className="sr-only">{t("currency")}</label>
            <Select id="currency" {...register("currency")}>
              {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
        </div>
        {err("ticketTypes") && <p role="alert" className="text-xs text-red-600">{te("invalid_input")}</p>}
        {fields.map((field, i) => (
          <fieldset key={field.id} className="space-y-3 rounded-xl border border-gray-200 p-4">
            <legend className="px-1 text-sm font-semibold">{t("ticketNumber", { index: i + 1 })}</legend>
            <input type="hidden" {...register(`ticketTypes.${i}.id`)} />
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField id={`tt-${i}-name`} label={t("ticketName")} error={err(`ticketTypes.${i}.name`)} required>
                <Input {...fieldAria(`tt-${i}-name`, err(`ticketTypes.${i}.name`))} {...register(`ticketTypes.${i}.name`)} />
              </FormField>
              <FormField id={`tt-${i}-price`} label={t("price")} error={err(`ticketTypes.${i}.price`)} hint={t("priceHint")} required>
                <Input type="number" min={0} step="0.01" {...fieldAria(`tt-${i}-price`, err(`ticketTypes.${i}.price`))} {...register(`ticketTypes.${i}.price`, { valueAsNumber: true })} />
              </FormField>
              <FormField id={`tt-${i}-qty`} label={t("quantity")} error={err(`ticketTypes.${i}.quantity`)} required>
                <Input type="number" min={1} {...fieldAria(`tt-${i}-qty`, err(`ticketTypes.${i}.quantity`))} {...register(`ticketTypes.${i}.quantity`, { valueAsNumber: true })} />
              </FormField>
            </div>
            <FormField id={`tt-${i}-desc`} label={t("ticketDescription")} error={err(`ticketTypes.${i}.description`)}>
              <Input {...fieldAria(`tt-${i}-desc`, err(`ticketTypes.${i}.description`))} {...register(`ticketTypes.${i}.description`)} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id={`tt-${i}-ss`} label={t("salesStart")} error={err(`ticketTypes.${i}.salesStart`)}>
                <Input type="datetime-local" {...register(`ticketTypes.${i}.salesStart`)} id={`tt-${i}-ss`} />
              </FormField>
              <FormField id={`tt-${i}-se`} label={t("salesEnd")} error={err(`ticketTypes.${i}.salesEnd`)}>
                <Input type="datetime-local" {...register(`ticketTypes.${i}.salesEnd`)} id={`tt-${i}-se`} />
              </FormField>
            </div>
            {fields.length > 1 && <Button variant="ghost" size="sm" onClick={() => remove(i)}>{t("removeTicket")}</Button>}
          </fieldset>
        ))}
        {fields.length < 10 && <Button variant="secondary" onClick={() => append(emptyTicket)}>{t("addTicket")}</Button>}
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>{t("cancel")}</Button>
        <Button type="submit" loading={pending}>{eventId ? t("save") : t("create")}</Button>
      </div>
    </form>
  );
}
