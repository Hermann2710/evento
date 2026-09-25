import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "@/db";
import { bookings, events, favorites, organizers, payments, tickets, ticketTypes, users, webhookEvents } from "@/db/schema";
import { createBooking } from "@/features/booking/services/booking-service";
import { handlePaymentWebhook } from "@/features/payments/services/webhook-service";
import { MOCK_SIGNATURE_HEADER, signMockWebhook } from "@/features/payments/providers/mock";
import { reviewEligibility } from "@/features/reviews/services";
import { getUserTicket } from "@/features/tickets/queries";
import { getUserBooking } from "@/features/booking/queries";
import { DomainError } from "@/lib/result";
import { randomCode } from "@/lib/utils";

const tag = randomCode(6).toLowerCase();
const webhookIds: string[] = [];
const ctx: { userId: string; otherId: string; eventId: string; ttId: string; freeTtId: string } = { userId: "", otherId: "", eventId: "", ttId: "", freeTtId: "" };

async function pay(bookingId: string, type: "payment.succeeded" | "payment.failed", eventId = `evt_${randomCode(10)}`) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  const providerPaymentId = `mock_${randomCode(12)}`;
  await db.insert(payments).values({ bookingId, provider: "mock", providerPaymentId, amount: booking.total, currency: booking.currency, status: "pending" });
  webhookIds.push(eventId);
  const body = JSON.stringify({ id: eventId, type, data: { providerPaymentId, amount: booking.total, currency: booking.currency } });
  const send = () => handlePaymentWebhook("mock", body, new Headers({ [MOCK_SIGNATURE_HEADER]: signMockWebhook(body) }));
  return { first: await send(), second: await send(), body };
}

describe.skipIf(!process.env.DATABASE_URL)("booking → payment → tickets (integration)", () => {
  beforeAll(async () => {
    const [u, o] = await db.insert(users).values([
      { email: `buyer-${tag}@test.local`, firstName: "Buyer", lastName: "Test" },
      { email: `org-${tag}@test.local`, firstName: "Org", lastName: "Test", role: "ORGANIZER" },
    ]).returning();
    const [org] = await db.insert(organizers).values({ userId: o.id, name: "Test Org", slug: `test-org-${tag}` }).returning();
    const [event] = await db.insert(events).values({
      organizerId: org.id, title: "Integration event", slug: `integration-${tag}`, description: "x".repeat(30),
      location: "Venue", city: "Douala", country: "CM", startDate: new Date(Date.now() + 7 * 86_400_000),
      endDate: new Date(Date.now() + 7 * 86_400_000 + 3_600_000), capacity: 10, status: "published",
    }).returning();
    const [tt, free] = await db.insert(ticketTypes).values([
      { eventId: event.id, name: "Paid", price: 1000, currency: "XAF", quantity: 3 },
      { eventId: event.id, name: "Free", price: 0, currency: "XAF", quantity: 5 },
    ]).returning();
    Object.assign(ctx, { userId: u.id, otherId: o.id, eventId: event.id, ttId: tt.id, freeTtId: free.id });
  });

  afterAll(async () => {
    await db.delete(bookings).where(eq(bookings.eventId, ctx.eventId));
    if (webhookIds.length) await db.delete(webhookEvents).where(and(eq(webhookEvents.provider, "mock"), inArray(webhookEvents.eventId, webhookIds)));
    await db.delete(users).where(inArray(users.id, [ctx.userId, ctx.otherId]));
    await pool.end();
  });

  it("recomputes prices server-side and reserves inventory", async () => {
    const res = await createBooking(ctx.userId, { eventId: ctx.eventId, items: [{ ticketTypeId: ctx.ttId, quantity: 2 }] });
    expect(res.total).toBe(2100); // 2 × 1000 + 5% fees — never trusted from the client
    const [tt] = await db.select().from(ticketTypes).where(eq(ticketTypes.id, ctx.ttId));
    expect(tt.soldQuantity).toBe(2);

    const { first, second } = await pay(res.bookingId, "payment.succeeded");
    expect(first.status).toBe(200);
    expect(second.body).toMatchObject({ duplicate: true }); // idempotent webhook
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, res.bookingId));
    expect(booking.status).toBe("confirmed");
    const userTickets = await db.select().from(tickets).where(eq(tickets.bookingId, res.bookingId));
    expect(userTickets).toHaveLength(2);
    expect(userTickets[0].qrCode.startsWith("data:image/png;base64,")).toBe(true);

    // Ownership: another user can access neither the ticket nor the booking (IDOR).
    expect(await getUserTicket(ctx.otherId, userTickets[0].id)).toBeNull();
    expect(await getUserBooking(ctx.otherId, res.bookingId)).toBeUndefined();
    expect(await getUserTicket(ctx.userId, userTickets[0].id)).not.toBeNull();
  });

  it("prevents overselling under concurrency (race condition)", async () => {
    // Only 1 paid ticket left: two concurrent bookings, exactly one must succeed.
    const results = await Promise.allSettled([
      createBooking(ctx.userId, { eventId: ctx.eventId, items: [{ ticketTypeId: ctx.ttId, quantity: 1 }] }),
      createBooking(ctx.otherId, { eventId: ctx.eventId, items: [{ ticketTypeId: ctx.ttId, quantity: 1 }] }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(DomainError);
    expect((rejected[0].reason as DomainError).code).toBe("sold_out");
  });

  it("releases inventory when the payment fails", async () => {
    const pending = await db.select().from(bookings).where(and(eq(bookings.eventId, ctx.eventId), eq(bookings.status, "pending")));
    const { first } = await pay(pending[0].id, "payment.failed");
    expect(first.status).toBe(200);
    const [tt] = await db.select().from(ticketTypes).where(eq(ticketTypes.id, ctx.ttId));
    expect(tt.soldQuantity).toBe(2);
  });

  it("confirms free bookings immediately without payment", async () => {
    const res = await createBooking(ctx.userId, { eventId: ctx.eventId, items: [{ ticketTypeId: ctx.freeTtId, quantity: 1 }] });
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, res.bookingId));
    expect(booking.status).toBe("confirmed");
  });

  it("rejects webhooks with an invalid signature", async () => {
    const res = await handlePaymentWebhook("mock", "{}", new Headers({ [MOCK_SIGNATURE_HEADER]: "t=1,v1=bad" }));
    expect(res.status).toBe(400);
  });

  it("only lets attendees review once the event has started", async () => {
    expect(await reviewEligibility(ctx.otherId, ctx.eventId)).toMatchObject({ allowed: false, reason: "not_attendee" });
    expect(await reviewEligibility(ctx.userId, ctx.eventId)).toMatchObject({ allowed: false, reason: "event_not_started" });
  });

  it("enforces unique favorites per user and event", async () => {
    await db.insert(favorites).values({ userId: ctx.userId, eventId: ctx.eventId });
    await expect(db.insert(favorites).values({ userId: ctx.userId, eventId: ctx.eventId })).rejects.toThrow();
  });
});
