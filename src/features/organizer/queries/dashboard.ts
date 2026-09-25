import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, events, tickets, ticketTypes, users } from "@/db/schema";

export async function organizerStats(organizerId: string) {
  const [eventCounts, bookingAgg, ticketAgg, revenue] = await Promise.all([
    db.select({ status: events.status, total: count() }).from(events).where(eq(events.organizerId, organizerId)).groupBy(events.status),
    db
      .select({ total: count() })
      .from(bookings)
      .innerJoin(events, eq(events.id, bookings.eventId))
      .where(and(eq(events.organizerId, organizerId), eq(bookings.status, "confirmed"))),
    db
      .select({ total: count() })
      .from(tickets)
      .innerJoin(events, eq(events.id, tickets.eventId))
      .where(and(eq(events.organizerId, organizerId), sql`${tickets.status} in ('valid','used')`)),
    db
      .select({ currency: bookings.currency, amount: sql<number>`coalesce(sum(${bookings.subtotal}), 0)::bigint` })
      .from(bookings)
      .innerJoin(events, eq(events.id, bookings.eventId))
      .where(and(eq(events.organizerId, organizerId), eq(bookings.status, "confirmed")))
      .groupBy(bookings.currency),
  ]);
  return {
    events: Object.fromEntries(eventCounts.map((e) => [e.status, e.total])) as Record<string, number>,
    totalEvents: eventCounts.reduce((s, e) => s + e.total, 0),
    confirmedBookings: bookingAgg[0]?.total ?? 0,
    ticketsSold: ticketAgg[0]?.total ?? 0,
    revenue: revenue.map((r) => ({ currency: r.currency, amount: Number(r.amount) })),
  };
}

export async function listOrganizerEvents(organizerId: string) {
  const rows = await db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      status: events.status,
      startDate: events.startDate,
      timezone: events.timezone,
      capacity: events.capacity,
      sold: sql<number>`(select coalesce(sum(${ticketTypes.soldQuantity}), 0)::int from ${ticketTypes} where ${ticketTypes.eventId} = ${events.id})`,
      revenue: sql<number>`(select coalesce(sum(b.subtotal), 0)::bigint from bookings b where b.event_id = ${events.id} and b.status = 'confirmed')`,
      currency: sql<string | null>`(select min(${ticketTypes.currency}) from ${ticketTypes} where ${ticketTypes.eventId} = ${events.id})`,
    })
    .from(events)
    .where(eq(events.organizerId, organizerId))
    .orderBy(desc(events.startDate));
  return rows.map((r) => ({ ...r, sold: Number(r.sold), revenue: Number(r.revenue) }));
}

export async function listOrganizerBookings(organizerId: string, opts: { eventId?: string; limit?: number } = {}) {
  const where = opts.eventId
    ? and(eq(events.organizerId, organizerId), eq(bookings.eventId, opts.eventId))
    : eq(events.organizerId, organizerId);
  return db
    .select({
      id: bookings.id,
      status: bookings.status,
      total: bookings.total,
      subtotal: bookings.subtotal,
      currency: bookings.currency,
      createdAt: bookings.createdAt,
      eventTitle: events.title,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      ticketCount: sql<number>`(select count(*)::int from tickets t where t.booking_id = ${bookings.id})`,
    })
    .from(bookings)
    .innerJoin(events, eq(events.id, bookings.eventId))
    .innerJoin(users, eq(users.id, bookings.userId))
    .where(where)
    .orderBy(desc(bookings.createdAt))
    .limit(opts.limit ?? 50);
}
