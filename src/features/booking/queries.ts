import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, events, payments } from "@/db/schema";

/** Ownership enforced in the WHERE clause (prevents IDOR). */
export async function getUserBooking(userId: string, bookingId: string) {
  return db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
    with: {
      event: { columns: { id: true, title: true, slug: true, startDate: true, timezone: true, city: true, location: true, coverImage: true } },
      items: { with: { ticketType: { columns: { name: true } } } },
      payments: { orderBy: [desc(payments.createdAt)] },
      tickets: { columns: { id: true, ticketNumber: true, status: true } },
    },
  });
}

export type UserBooking = NonNullable<Awaited<ReturnType<typeof getUserBooking>>>;

export async function listUserBookings(userId: string, page: number, pageSize = 10) {
  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: bookings.id,
        status: bookings.status,
        total: bookings.total,
        currency: bookings.currency,
        createdAt: bookings.createdAt,
        eventTitle: events.title,
        eventSlug: events.slug,
        startDate: events.startDate,
        timezone: events.timezone,
      })
      .from(bookings)
      .innerJoin(events, eq(events.id, bookings.eventId))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(bookings).where(eq(bookings.userId, userId)),
  ]);
  return { items, total };
}
