"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { db } from "@/db";
import { bookings, payments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/rate-limit";
import { publish } from "@/lib/realtime/publish";
import { rooms, SOCKET_EVENTS } from "@/lib/realtime/events";
import { errorFromUnknown, fail, ok, toFieldErrors, type ActionResult } from "@/lib/result";
import { activePaymentProvider } from "@/features/payments/providers";
import { createBookingSchema } from "./validations";
import { cancelPendingBookingTx, createBooking, getTicketAvailability } from "./services/booking-service";
import { afterBookingConfirmed } from "./services/after-confirm";

export async function createBookingAction(values: unknown): Promise<ActionResult<{ bookingId: string; free: boolean }>> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  const parsed = createBookingSchema.safeParse(values);
  if (!parsed.success) return fail("invalid_input", toFieldErrors(parsed.error.issues));
  if (!rateLimit(`booking:${user.id}`, 10, 60_000).ok) return fail("rate_limited");

  try {
    const result = await createBooking(user.id, parsed.data);
    const free = result.total === 0;
    if (free) {
      const count = parsed.data.items.reduce((s, i) => s + i.quantity, 0);
      await afterBookingConfirmed(result.bookingId, { paid: false, ticketCount: count });
    } else {
      const ticketTypes = await getTicketAvailability(result.eventId);
      await publish(rooms.event(result.eventId), SOCKET_EVENTS.ticketAvailability, { eventId: result.eventId, ticketTypes });
    }
    return ok({ bookingId: result.bookingId, free });
  } catch (error) {
    return fail(errorFromUnknown(error));
  }
}

/** Creates a payment with the active provider and returns the hosted payment URL. */
export async function startPaymentAction(bookingId: unknown): Promise<ActionResult<{ redirectUrl: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  const id = z.uuid().safeParse(bookingId);
  if (!id.success) return fail("invalid_input");

  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, id.data), eq(bookings.userId, user.id)))
    .limit(1);
  if (!booking) return fail("not_found");
  if (booking.status !== "pending") return fail("booking_not_pending");
  if (booking.expiresAt && booking.expiresAt.getTime() < Date.now()) {
    await db.transaction((tx) => cancelPendingBookingTx(tx, booking.id, "expired"));
    return fail("booking_expired");
  }

  const provider = activePaymentProvider();
  const [existing] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.bookingId, booking.id), eq(payments.provider, provider.name), inArray(payments.status, ["pending", "processing"])))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  const existingUrl = existing?.metadata?.redirectUrl;
  if (typeof existingUrl === "string") return ok({ redirectUrl: existingUrl });

  const locale = await getLocale();
  const paymentId = crypto.randomUUID();
  const created = await provider.createPayment({
    paymentId,
    bookingId: booking.id,
    amount: booking.total,
    currency: booking.currency,
    locale,
    customerEmail: user.email,
  });
  await db.insert(payments).values({
    id: paymentId,
    bookingId: booking.id,
    provider: provider.name,
    providerPaymentId: created.providerPaymentId,
    amount: booking.total,
    currency: booking.currency,
    status: "pending",
    metadata: { redirectUrl: created.redirectUrl },
  });
  return ok({ redirectUrl: created.redirectUrl });
}

export async function cancelBookingAction(bookingId: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  const id = z.uuid().safeParse(bookingId);
  if (!id.success) return fail("invalid_input");
  const [booking] = await db
    .select({ id: bookings.id, eventId: bookings.eventId })
    .from(bookings)
    .where(and(eq(bookings.id, id.data), eq(bookings.userId, user.id)))
    .limit(1);
  if (!booking) return fail("not_found");
  const canceled = await db.transaction((tx) => cancelPendingBookingTx(tx, booking.id, "canceled"));
  if (!canceled) return fail("booking_not_pending");
  const ticketTypes = await getTicketAvailability(booking.eventId);
  await publish(rooms.event(booking.eventId), SOCKET_EVENTS.ticketAvailability, { eventId: booking.eventId, ticketTypes });
  return ok();
}
