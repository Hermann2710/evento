import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db, type Transaction } from "@/db";
import { bookingItems, bookings, events, payments, tickets, ticketTypes } from "@/db/schema";
import { BOOKING_HOLD_MINUTES, computeTotals } from "@/lib/pricing";
import { DomainError } from "@/lib/result";
import { createTicketQr } from "@/lib/qrcode";
import { randomCode } from "@/lib/utils";
import type { CreateBookingInput } from "../validations";

type ItemRef = { ticketTypeId: string; quantity: number };

/**
 * Atomically reserves inventory. The conditional UPDATE is evaluated under a row lock,
 * so concurrent bookings can never oversell (no read-then-write race).
 */
async function reserveItems(tx: Transaction, items: ItemRef[]): Promise<void> {
  for (const item of items) {
    const updated = await tx
      .update(ticketTypes)
      .set({ soldQuantity: sql`${ticketTypes.soldQuantity} + ${item.quantity}` })
      .where(and(eq(ticketTypes.id, item.ticketTypeId), sql`${ticketTypes.soldQuantity} + ${item.quantity} <= ${ticketTypes.quantity}`))
      .returning({ id: ticketTypes.id });
    if (!updated.length) throw new DomainError("sold_out");
  }
}

async function releaseItems(tx: Transaction, bookingId: string): Promise<void> {
  const items = await tx.select().from(bookingItems).where(eq(bookingItems.bookingId, bookingId));
  for (const item of items) {
    await tx
      .update(ticketTypes)
      .set({ soldQuantity: sql`greatest(${ticketTypes.soldQuantity} - ${item.quantity}, 0)` })
      .where(eq(ticketTypes.id, item.ticketTypeId));
  }
}

export async function createBooking(userId: string, input: CreateBookingInput) {
  await releaseExpiredBookings();
  return db.transaction(async (tx) => {
    const [event] = await tx
      .select({ id: events.id, status: events.status, startDate: events.startDate })
      .from(events)
      .where(eq(events.id, input.eventId))
      .limit(1);
    if (!event || event.status !== "published") throw new DomainError("event_unavailable");
    if (event.startDate.getTime() < Date.now()) throw new DomainError("event_past");

    const ids = input.items.map((i) => i.ticketTypeId);
    const types = await tx
      .select()
      .from(ticketTypes)
      .where(and(eq(ticketTypes.eventId, event.id), inArray(ticketTypes.id, ids)));
    if (types.length !== ids.length) throw new DomainError("invalid_ticket");

    const now = Date.now();
    for (const type of types) {
      if ((type.salesStart && type.salesStart.getTime() > now) || (type.salesEnd && type.salesEnd.getTime() < now)) {
        throw new DomainError("sales_closed");
      }
    }
    const currencies = new Set(types.map((t) => t.currency));
    if (currencies.size !== 1) throw new DomainError("invalid_ticket");

    await reserveItems(tx, input.items);

    // Prices always come from the database, never from the client.
    const lines = input.items.map((item) => {
      const type = types.find((t) => t.id === item.ticketTypeId)!;
      return { ticketTypeId: type.id, quantity: item.quantity, unitPrice: type.price, totalPrice: type.price * item.quantity };
    });
    const totals = computeTotals(lines);

    const [booking] = await tx
      .insert(bookings)
      .values({
        userId,
        eventId: event.id,
        status: "pending",
        ...totals,
        currency: types[0].currency,
        expiresAt: new Date(now + BOOKING_HOLD_MINUTES * 60_000),
      })
      .returning({ id: bookings.id, total: bookings.total });
    await tx.insert(bookingItems).values(lines.map((l) => ({ ...l, bookingId: booking.id })));

    if (booking.total === 0) await confirmBookingTx(tx, booking.id);
    return { bookingId: booking.id, eventId: event.id, total: booking.total };
  });
}

/** Idempotent: returns null when the booking was not pending (already confirmed, expired...). */
export async function confirmBookingTx(tx: Transaction, bookingId: string) {
  const [booking] = await tx
    .update(bookings)
    .set({ status: "confirmed", expiresAt: null })
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, "pending")))
    .returning();
  if (!booking) return null;

  const items = await tx.select().from(bookingItems).where(eq(bookingItems.bookingId, bookingId));
  const rows: Array<typeof tickets.$inferInsert> = [];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      const ticketNumber = `EVT-${randomCode(10)}`;
      rows.push({
        bookingId,
        bookingItemId: item.id,
        userId: booking.userId,
        eventId: booking.eventId,
        ticketTypeId: item.ticketTypeId,
        ticketNumber,
        qrCode: await createTicketQr(ticketNumber),
      });
    }
  }
  if (rows.length) await tx.insert(tickets).values(rows);
  return { booking, ticketCount: rows.length };
}

/** Re-reserves inventory for a booking whose hold expired before payment arrived. */
export async function revivePendingTx(tx: Transaction, bookingId: string): Promise<boolean> {
  const items = await tx.select().from(bookingItems).where(eq(bookingItems.bookingId, bookingId));
  try {
    await tx.transaction(async (sp) => reserveItems(sp, items));
  } catch {
    return false;
  }
  await tx.update(bookings).set({ status: "pending" }).where(eq(bookings.id, bookingId));
  return true;
}

export async function cancelPendingBookingTx(
  tx: Transaction,
  bookingId: string,
  status: "expired" | "failed" | "canceled",
): Promise<boolean> {
  const [updated] = await tx
    .update(bookings)
    .set({ status })
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, "pending")))
    .returning({ id: bookings.id });
  if (!updated) return false;
  await releaseItems(tx, bookingId);
  await tx
    .update(payments)
    .set({ status: "failed" })
    .where(and(eq(payments.bookingId, bookingId), inArray(payments.status, ["pending", "processing"])));
  return true;
}

export async function refundBookingTx(tx: Transaction, bookingId: string): Promise<void> {
  const [updated] = await tx
    .update(bookings)
    .set({ status: "refunded" })
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, "confirmed")))
    .returning({ id: bookings.id });
  if (!updated) return;
  await tx.update(tickets).set({ status: "canceled" }).where(eq(tickets.bookingId, bookingId));
  await releaseItems(tx, bookingId);
}

/** Releases inventory held by abandoned checkouts. Called lazily before new reservations. */
export async function releaseExpiredBookings(): Promise<number> {
  const expired = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.status, "pending"), lt(bookings.expiresAt, new Date())))
    .limit(100);
  let released = 0;
  for (const b of expired) {
    if (await db.transaction((tx) => cancelPendingBookingTx(tx, b.id, "expired"))) released++;
  }
  return released;
}

export async function getTicketAvailability(eventId: string) {
  const rows = await db
    .select({ id: ticketTypes.id, quantity: ticketTypes.quantity, sold: ticketTypes.soldQuantity })
    .from(ticketTypes)
    .where(eq(ticketTypes.eventId, eventId));
  return rows.map((r) => ({ id: r.id, remaining: Math.max(0, r.quantity - r.sold) }));
}
