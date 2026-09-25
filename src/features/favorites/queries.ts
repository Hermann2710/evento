import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, events, favorites } from "@/db/schema";
import type { EventListItem } from "@/features/events/queries/list-events";

export async function isFavorite(userId: string, eventId: string): Promise<boolean> {
  const [row] = await db
    .select({ eventId: favorites.eventId })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.eventId, eventId)))
    .limit(1);
  return Boolean(row);
}

export async function listFavorites(userId: string): Promise<EventListItem[]> {
  const rows = await db
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
      minPrice: sql<number | null>`(select min(price) from ticket_types where event_id = ${events.id})`,
      currency: sql<string | null>`(select min(currency) from ticket_types where event_id = ${events.id})`,
      remaining: sql<number>`(select coalesce(sum(quantity - sold_quantity), 0)::int from ticket_types where event_id = ${events.id})`,
    })
    .from(favorites)
    .innerJoin(events, eq(events.id, favorites.eventId))
    .leftJoin(categories, eq(categories.id, events.categoryId))
    .where(and(eq(favorites.userId, userId), sql`${events.status} in ('published', 'canceled')`))
    .orderBy(desc(favorites.createdAt));
  return rows.map((r) => ({ ...r, sold: 0, minPrice: r.minPrice === null ? null : Number(r.minPrice), remaining: Number(r.remaining) }));
}
