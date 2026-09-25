import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, events, users } from "@/db/schema";
import { renderEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { formatMoney } from "@/lib/format";
import { publish } from "@/lib/realtime/publish";
import { rooms, SOCKET_EVENTS } from "@/lib/realtime/events";
import { absoluteUrl } from "@/lib/site";
import { notify } from "@/features/notifications/services/notify";
import { getTicketAvailability } from "./booking-service";

/** Side effects after the transaction commits: realtime, notifications, emails. Never throws. */
export async function afterBookingConfirmed(bookingId: string, opts: { paid: boolean; ticketCount: number }): Promise<void> {
  try {
    const [row] = await db
      .select({
        userId: bookings.userId,
        eventId: bookings.eventId,
        total: bookings.total,
        currency: bookings.currency,
        eventTitle: events.title,
        email: users.email,
        locale: users.locale,
        firstName: users.firstName,
      })
      .from(bookings)
      .innerJoin(events, eq(events.id, bookings.eventId))
      .innerJoin(users, eq(users.id, bookings.userId))
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!row) return;

    const amount = formatMoney(row.total, row.currency, row.locale);
    const params = { event: row.eventTitle, amount, count: opts.ticketCount, name: row.firstName };

    await Promise.allSettled([
      publish(rooms.booking(bookingId), SOCKET_EVENTS.bookingStatus, { bookingId, status: "confirmed" }),
      getTicketAvailability(row.eventId).then((ticketTypes) =>
        publish(rooms.event(row.eventId), SOCKET_EVENTS.ticketAvailability, { eventId: row.eventId, ticketTypes }),
      ),
      notify({ userId: row.userId, type: "booking_confirmed", key: "bookingConfirmed", params, link: `/bookings/${bookingId}` }),
      opts.paid
        ? notify({ userId: row.userId, type: "payment_succeeded", key: "paymentSucceeded", params, link: `/bookings/${bookingId}` })
        : Promise.resolve(),
      sendEmail({ to: row.email, ...renderEmail("bookingConfirmation", row.locale, params, absoluteUrl(`/${row.locale}/bookings/${bookingId}`)) }),
      opts.paid
        ? sendEmail({ to: row.email, ...renderEmail("paymentConfirmation", row.locale, params) })
        : Promise.resolve(),
      sendEmail({ to: row.email, ...renderEmail("ticketDelivery", row.locale, params, absoluteUrl(`/${row.locale}/tickets`)) }),
    ]);
  } catch (error) {
    console.error("[booking] post-confirmation side effects failed", error);
  }
}

export async function afterPaymentFailed(bookingId: string): Promise<void> {
  try {
    const [row] = await db
      .select({ userId: bookings.userId, eventId: bookings.eventId, eventTitle: events.title })
      .from(bookings)
      .innerJoin(events, eq(events.id, bookings.eventId))
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!row) return;
    await Promise.allSettled([
      publish(rooms.booking(bookingId), SOCKET_EVENTS.bookingStatus, { bookingId, status: "failed" }),
      getTicketAvailability(row.eventId).then((ticketTypes) =>
        publish(rooms.event(row.eventId), SOCKET_EVENTS.ticketAvailability, { eventId: row.eventId, ticketTypes }),
      ),
      notify({ userId: row.userId, type: "payment_failed", key: "paymentFailed", params: { event: row.eventTitle }, link: `/bookings/${bookingId}` }),
    ]);
  } catch (error) {
    console.error("[booking] payment failure side effects failed", error);
  }
}
