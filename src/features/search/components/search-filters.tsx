import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { DATE_PRESETS, SORT_OPTIONS, type SearchParams } from "../validations";

const labelClass = "mb-1.5 block text-sm font-medium text-gray-800";

/** Pure HTML GET form: filters live in URL search params, no client JS required. */
export function SearchFilters({ params, categories }: { params: SearchParams; categories: Array<{ slug: string; name: string }> }) {
  const t = useTranslations("search");
  const locale = useLocale();
  return (
    <form action={`/${locale}/search`} method="get" className="space-y-4" aria-label={t("filtersLabel")}>
      <div>
        <label htmlFor="f-q" className={labelClass}>{t("query")}</label>
        <Input id="f-q" name="q" type="search" defaultValue={params.q} placeholder={t("queryPlaceholder")} />
      </div>
      <div>
        <label htmlFor="f-category" className={labelClass}>{t("category")}</label>
        <Select id="f-category" name="category" defaultValue={params.category ?? ""}>
          <option value="">{t("allCategories")}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="f-city" className={labelClass}>{t("city")}</label>
          <Input id="f-city" name="city" defaultValue={params.city} />
        </div>
        <div>
          <label htmlFor="f-country" className={labelClass}>{t("country")}</label>
          <Input id="f-country" name="country" defaultValue={params.country} />
        </div>
      </div>
      <div>
        <label htmlFor="f-date" className={labelClass}>{t("date")}</label>
        <Select id="f-date" name="date" defaultValue={params.date ?? ""}>
          <option value="">{t("anyDate")}</option>
          {DATE_PRESETS.map((d) => (
            <option key={d} value={d}>{t(`dates.${d}`)}</option>
          ))}
        </Select>
      </div>
      <fieldset>
        <legend className={labelClass}>{t("price")}</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="f-min" className="sr-only">{t("priceMin")}</label>
            <Input id="f-min" name="priceMin" type="number" min={0} step="any" inputMode="decimal" placeholder={t("priceMin")} defaultValue={params.priceMin} />
          </div>
          <div>
            <label htmlFor="f-max" className="sr-only">{t("priceMax")}</label>
            <Input id="f-max" name="priceMax" type="number" min={0} step="any" inputMode="decimal" placeholder={t("priceMax")} defaultValue={params.priceMax} />
          </div>
        </div>
      </fieldset>
      <div>
        <label htmlFor="f-sort" className={labelClass}>{t("sort")}</label>
        <Select id="f-sort" name="sort" defaultValue={params.sort}>
          {SORT_OPTIONS.map((s) => (
            <option key={s} value={s}>{t(`sorts.${s}`)}</option>
          ))}
        </Select>
      </div>
      <div className="flex gap-2">
        <button type="submit" className={buttonClass({ className: "flex-1" })}>{t("apply")}</button>
        <Link href="/search" className={buttonClass({ variant: "outline" })}>{t("reset")}</Link>
      </div>
    </form>
  );
}
