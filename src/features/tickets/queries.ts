import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, tickets, ticketTypes } from "@/db/schema";

const ticketColumns = {
  id: tickets.id,
  ticketNumber: tickets.ticketNumber,
  status: tickets.status,
  qrCode: tickets.qrCode,
  createdAt: tickets.createdAt,
  bookingId: tickets.bookingId,
  ticketTypeName: ticketTypes.name,
  eventTitle: events.title,
  eventSlug: events.slug,
  eventStatus: events.status,
  startDate: events.startDate,
  endDate: events.endDate,
  timezone: events.timezone,
  location: events.location,
  city: events.city,
  country: events.country,
  coverImage: events.coverImage,
};

export async function listUserTickets(userId: string) {
  const rows = await db
    .select(ticketColumns)
    .from(tickets)
    .innerJoin(events, eq(events.id, tickets.eventId))
    .innerJoin(ticketTypes, eq(ticketTypes.id, tickets.ticketTypeId))
    .where(eq(tickets.userId, userId))
    .orderBy(desc(events.startDate));
  return rows.map(({ qrCode: _qr, ...r }) => r);
}

/** A user can only ever read their own tickets (ownership in WHERE → no IDOR). */
export async function getUserTicket(userId: string, ticketId: string) {
  const [row] = await db
    .select(ticketColumns)
    .from(tickets)
    .innerJoin(events, eq(events.id, tickets.eventId))
    .innerJoin(ticketTypes, eq(ticketTypes.id, tickets.ticketTypeId))
    .where(and(eq(tickets.id, ticketId), eq(tickets.userId, userId)))
    .limit(1);
  return row ?? null;
}
