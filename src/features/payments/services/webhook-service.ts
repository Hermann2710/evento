import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments, webhookEvents } from "@/db/schema";
import {
  cancelPendingBookingTx,
  confirmBookingTx,
  refundBookingTx,
  revivePendingTx,
} from "@/features/booking/services/booking-service";
import { afterBookingConfirmed, afterPaymentFailed } from "@/features/booking/services/after-confirm";
import { publish } from "@/lib/realtime/publish";
import { rooms, SOCKET_EVENTS } from "@/lib/realtime/events";
import { getPaymentProvider } from "../providers";
import { WebhookVerificationError, type PaymentProvider, type ProviderWebhookEvent } from "../providers/types";

type SideEffect = () => Promise<void>;

async function applyEvent(provider: PaymentProvider, event: ProviderWebhookEvent): Promise<SideEffect | null> {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.provider, provider.name), eq(payments.providerPaymentId, event.providerPaymentId)))
      .for("update");
    if (!payment) throw new Error("unknown payment");
    if (payment.amount !== event.amount || payment.currency !== event.currency) throw new Error("amount mismatch");

    const statusFx: SideEffect = () =>
      publish(rooms.booking(payment.bookingId), SOCKET_EVENTS.paymentStatus, {
        bookingId: payment.bookingId,
        paymentId: payment.id,
        status: event.type.replace("payment.", ""),
      });

    switch (event.type) {
      case "payment.processing": {
        if (payment.status === "pending") {
          await tx.update(payments).set({ status: "processing" }).where(eq(payments.id, payment.id));
        }
        return statusFx;
      }
      case "payment.succeeded": {
        if (payment.status === "succeeded") return null;
        await tx.update(payments).set({ status: "succeeded" }).where(eq(payments.id, payment.id));
        const [booking] = await tx.select({ status: bookings.status }).from(bookings).where(eq(bookings.id, payment.bookingId)).for("update");
        if (booking && booking.status !== "pending" && booking.status !== "confirmed") {
          // Hold expired before the payment arrived: try to re-reserve, otherwise refund.
          if (!(await revivePendingTx(tx, payment.bookingId))) {
            await provider.refund(payment.providerPaymentId, payment.amount);
            await tx.update(payments).set({ status: "refunded" }).where(eq(payments.id, payment.id));
            return async () => {
              await statusFx();
              await afterPaymentFailed(payment.bookingId);
            };
          }
        }
        const confirmed = await confirmBookingTx(tx, payment.bookingId);
        return async () => {
          await statusFx();
          if (confirmed) await afterBookingConfirmed(payment.bookingId, { paid: true, ticketCount: confirmed.ticketCount });
        };
      }
      case "payment.failed": {
        if (payment.status === "succeeded" || payment.status === "refunded") return null;
        await tx.update(payments).set({ status: "failed" }).where(eq(payments.id, payment.id));
        await cancelPendingBookingTx(tx, payment.bookingId, "failed");
        return async () => {
          await statusFx();
          await afterPaymentFailed(payment.bookingId);
        };
      }
      case "payment.refunded": {
        if (payment.status === "refunded") return null;
        await tx.update(payments).set({ status: "refunded" }).where(eq(payments.id, payment.id));
        await refundBookingTx(tx, payment.bookingId);
        return statusFx;
      }
    }
  });
}

export type WebhookResult = { status: number; body: Record<string, unknown> };

/**
 * Verifies, deduplicates (idempotency via unique provider+eventId), processes inside a
 * transaction and logs every delivery. Returns 5xx on processing errors so the provider retries.
 */
export async function handlePaymentWebhook(providerName: string, rawBody: string, headers: Headers): Promise<WebhookResult> {
  const provider = getPaymentProvider(providerName);
  if (!provider) return { status: 404, body: { error: "unknown_provider" } };

  let event: ProviderWebhookEvent;
  try {
    event = await provider.verifyWebhook(rawBody, headers);
  } catch (error) {
    const reason = error instanceof WebhookVerificationError ? error.message : "verification failed";
    console.warn(`[webhook:${providerName}] rejected: ${reason}`);
    return { status: 400, body: { error: "invalid_signature" } };
  }

  const [inserted] = await db
    .insert(webhookEvents)
    .values({ provider: provider.name, eventId: event.id, type: event.type, payload: event.raw, attempts: 1 })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });

  let logId = inserted?.id;
  if (!logId) {
    const [existing] = await db
      .select({ id: webhookEvents.id, status: webhookEvents.status })
      .from(webhookEvents)
      .where(and(eq(webhookEvents.provider, provider.name), eq(webhookEvents.eventId, event.id)))
      .limit(1);
    if (existing?.status === "processed") return { status: 200, body: { received: true, duplicate: true } };
    logId = existing.id;
    await db.update(webhookEvents).set({ attempts: sql`${webhookEvents.attempts} + 1` }).where(eq(webhookEvents.id, logId));
  }

  try {
    const sideEffect = await applyEvent(provider, event);
    await db
      .update(webhookEvents)
      .set({ status: "processed", processedAt: new Date(), error: null })
      .where(eq(webhookEvents.id, logId));
    console.info(`[webhook:${providerName}] processed ${event.type} ${event.id}`);
    if (sideEffect) await sideEffect();
    return { status: 200, body: { received: true } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.update(webhookEvents).set({ status: "failed", error: message.slice(0, 500) }).where(eq(webhookEvents.id, logId));
    console.error(`[webhook:${providerName}] failed ${event.type} ${event.id}: ${message}`);
    return { status: 500, body: { error: "processing_failed" } };
  }
}
