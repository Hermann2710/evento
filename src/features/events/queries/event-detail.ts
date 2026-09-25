import { cache } from "react";
import { and, asc, avg, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { eventImages, events, reviews, ticketTypes } from "@/db/schema";

export const getEventBySlug = cache(async (slug: string) => {
  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    with: {
      category: true,
      organizer: { columns: { id: true, name: true, slug: true, image: true, userId: true, description: true } },
      images: { orderBy: [asc(eventImages.position)] },
      ticketTypes: { orderBy: [asc(ticketTypes.price)] },
    },
  });
  if (!event) return null;
  const [stats] = await db
    .select({ average: avg(reviews.rating), total: count() })
    .from(reviews)
    .where(and(eq(reviews.eventId, event.id), eq(reviews.hidden, false)));
  return {
    ...event,
    rating: { average: stats?.average ? Number(stats.average) : null, total: stats?.total ?? 0 },
  };
});

export type EventDetail = NonNullable<Awaited<ReturnType<typeof getEventBySlug>>>;

export type EventAvailability = "available" | "sold_out" | "past" | "canceled" | "unpublished";

export function getAvailability(event: Pick<EventDetail, "status" | "endDate" | "ticketTypes">): EventAvailability {
  if (event.status === "canceled") return "canceled";
  if (event.status !== "published") return "unpublished";
  if (event.endDate.getTime() < Date.now()) return "past";
  const remaining = event.ticketTypes.reduce((s, t) => s + (t.quantity - t.soldQuantity), 0);
  return remaining <= 0 ? "sold_out" : "available";
}
