import { z } from "zod";

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalText = (max: number) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional()).catch(undefined);
const optionalNumber = z.preprocess(emptyToUndefined, z.coerce.number().min(0).max(100_000_000).optional()).catch(undefined);

export const DATE_PRESETS = ["today", "tomorrow", "week", "weekend", "month"] as const;
export const SORT_OPTIONS = ["date", "price_asc", "price_desc", "popular", "newest"] as const;

export const searchParamsSchema = z.object({
  q: optionalText(100),
  category: z.preprocess(emptyToUndefined, z.string().regex(/^[a-z0-9-]{1,100}$/).optional()).catch(undefined),
  city: optionalText(100),
  country: optionalText(100),
  date: z.preprocess(emptyToUndefined, z.enum(DATE_PRESETS).optional()).catch(undefined),
  priceMin: optionalNumber,
  priceMax: optionalNumber,
  sort: z.enum(SORT_OPTIONS).catch("date"),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;
export type DatePreset = (typeof DATE_PRESETS)[number];
export type SortOption = (typeof SORT_OPTIONS)[number];

export type RawSearchParams = Record<string, string | string[] | undefined>;

export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Normalizes Next.js searchParams and validates them with Zod (invalid values fall back to defaults). */
export function parseSearchParams(raw: RawSearchParams): SearchParams {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) flat[k] = first(v);
  return searchParamsSchema.parse({ ...flat, sort: flat.sort ?? "date", page: flat.page ?? 1 });
}

export function toQueryRecord(params: SearchParams): Record<string, string | undefined> {
  return {
    q: params.q,
    category: params.category,
    city: params.city,
    country: params.country,
    date: params.date,
    priceMin: params.priceMin?.toString(),
    priceMax: params.priceMax?.toString(),
    sort: params.sort === "date" ? undefined : params.sort,
  };
}
