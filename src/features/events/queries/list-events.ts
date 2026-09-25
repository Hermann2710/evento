import { and, asc, count, desc, eq, gte, ilike, inArray, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, events, ticketTypes } from "@/db/schema";
import { toMinor } from "@/lib/format";
import type { DatePreset, SortOption } from "@/features/search/validations";

export type EventListItem = {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  location: string;
  city: string;
  country: string;
  startDate: Date;
  timezone: string;
  status: string;
  categoryName: string | null;
  categorySlug: string | null;
  minPrice: number | null;
  currency: string | null;
  sold: number;
  remaining: number;
};

export type EventFilters = {
  q?: string;
  category?: string;
  categoryIds?: string[];
  city?: string;
  country?: string;
  date?: DatePreset;
  priceMin?: number;
  priceMax?: number;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
  featured?: boolean;
  excludeId?: string;
  organizerId?: string;
};

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function dateRange(preset: DatePreset, now = new Date()): { from: Date; to: Date } {
  const day = 86_400_000;
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  switch (preset) {
    case "today":
      return { from: now, to: new Date(startOfToday.getTime() + day) };
    case "tomorrow":
      return { from: new Date(startOfToday.getTime() + day), to: new Date(startOfToday.getTime() + 2 * day) };
    case "week":
      return { from: now, to: new Date(now.getTime() + 7 * day) };
    case "weekend": {
      const dow = startOfToday.getUTCDay();
      const saturday = new Date(startOfToday.getTime() + ((6 - dow + 7) % 7) * day);
      const from = dow === 0 ? startOfToday : saturday;
      return { from, to: new Date((dow === 0 ? startOfToday.getTime() : saturday.getTime() + day) + day) };
    }
    case "month":
      return { from: now, to: new Date(now.getTime() + 30 * day) };
  }
}

const ticketStats = db
  .select({
    eventId: ticketTypes.eventId,
    minPrice: sql<number>`min(${ticketTypes.price})`.as("min_price"),
    currency: sql<string>`min(${ticketTypes.currency})`.as("ts_currency"),
    sold: sql<number>`coalesce(sum(${ticketTypes.soldQuantity}), 0)::int`.as("sold"),
    totalQty: sql<number>`coalesce(sum(${ticketTypes.quantity}), 0)::int`.as("total_qty"),
  })
  .from(ticketTypes)
  .groupBy(ticketTypes.eventId)
  .as("ts");

function buildWhere(f: EventFilters): SQL | undefined {
  const now = new Date();
  const conditions: Array<SQL | undefined> = [eq(events.status, "published"), gte(events.endDate, now)];
  if (f.q) {
    const term = `%${escapeLike(f.q)}%`;
    conditions.push(or(ilike(events.title, term), ilike(events.description, term), ilike(events.city, term)));
  }
  if (f.category) conditions.push(eq(categories.slug, f.category));
  if (f.categoryIds?.length) conditions.push(inArray(events.categoryId, f.categoryIds));
  if (f.city) conditions.push(ilike(events.city, `%${escapeLike(f.city)}%`));
  if (f.country) conditions.push(ilike(events.country, `%${escapeLike(f.country)}%`));
  if (f.date) {
    const { from, to } = dateRange(f.date, now);
    conditions.push(lt(events.startDate, to), gte(events.endDate, from));
  }
  if (f.priceMin !== undefined) conditions.push(gte(sql`coalesce(${ticketStats.minPrice}, 0)`, toMinor(f.priceMin)));
  if (f.priceMax !== undefined) conditions.push(sql`coalesce(${ticketStats.minPrice}, 0) <= ${toMinor(f.priceMax)}`);
  if (f.featured) conditions.push(eq(events.isFeatured, true));
  if (f.excludeId) conditions.push(ne(events.id, f.excludeId));
  if (f.organizerId) conditions.push(eq(events.organizerId, f.organizerId));
  return and(...conditions);
}

function orderBy(sort: SortOption = "date"): SQL[] {
  switch (sort) {
    case "price_asc":
      return [sql`${ticketStats.minPrice} asc nulls last`, asc(events.startDate)];
    case "price_desc":
      return [sql`${ticketStats.minPrice} desc nulls last`, asc(events.startDate)];
    case "popular":
      return [sql`${ticketStats.sold} desc nulls last`, asc(events.startDate)];
    case "newest":
      return [desc(events.createdAt)];
    default:
      return [asc(events.startDate)];
  }
}

/** Single optimized query (one join on an aggregated subquery, no N+1) + a count query. */
export async function listEvents(filters: EventFilters = {}): Promise<{ items: EventListItem[]; total: number }> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;
  const where = buildWhere(filters);

  const itemsQuery = db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      coverImage: events.coverImage,
      location: events.location,
      city: events.city,
      country: events.country,
      startDate: events.startDate,
      timezone: events.timezone,
      status: events.status,
      categoryName: categories.name,
      categorySlug: categories.slug,
      minPrice: ticketStats.minPrice,
      currency: ticketStats.currency,
      sold: ticketStats.sold,
      totalQty: ticketStats.totalQty,
    })
    .from(events)
    .leftJoin(categories, eq(events.categoryId, categories.id))
    .leftJoin(ticketStats, eq(ticketStats.eventId, events.id))
    .where(where)
    .orderBy(...orderBy(filters.sort))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const countQuery = db
    .select({ total: count() })
    .from(events)
    .leftJoin(categories, eq(events.categoryId, categories.id))
    .leftJoin(ticketStats, eq(ticketStats.eventId, events.id))
    .where(where);

  const [rows, [{ total }]] = await Promise.all([itemsQuery, countQuery]);
  return {
    total,
    items: rows.map(({ totalQty, ...r }) => ({
      ...r,
      sold: Number(r.sold ?? 0),
      remaining: Math.max(0, Number(totalQty ?? 0) - Number(r.sold ?? 0)),
      minPrice: r.minPrice === null ? null : Number(r.minPrice),
    })),
  };
}
