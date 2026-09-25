"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { bookings, payments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { randomToken } from "@/lib/tokens";
import { fail, ok, type ActionResult } from "@/lib/result";
import { MOCK_SIGNATURE_HEADER, signMockWebhook } from "./providers/mock";
import { handlePaymentWebhook } from "./services/webhook-service";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sandbox only: simulates the provider's hosted page. It does NOT mark the payment as paid;
 * it emits a signed webhook exactly like a real provider would, delivered with retries.
 */
export async function simulateMockPaymentAction(
  paymentId: unknown,
  outcome: unknown,
): Promise<ActionResult<{ bookingId: string }>> {
  if ((process.env.PAYMENT_PROVIDER || "mock") !== "mock") return fail("forbidden");
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  const input = z.object({ paymentId: z.uuid(), outcome: z.enum(["success", "failure"]) }).safeParse({ paymentId, outcome });
  if (!input.success) return fail("invalid_input");

  const [payment] = await db
    .select({ id: payments.id, providerPaymentId: payments.providerPaymentId, amount: payments.amount, currency: payments.currency, bookingId: payments.bookingId, status: payments.status })
    .from(payments)
    .innerJoin(bookings, eq(bookings.id, payments.bookingId))
    .where(and(eq(payments.id, input.data.paymentId), eq(payments.provider, "mock"), eq(bookings.userId, user.id)))
    .limit(1);
  if (!payment) return fail("not_found");
  if (payment.status !== "pending" && payment.status !== "processing") return ok({ bookingId: payment.bookingId });

  const body = JSON.stringify({
    id: `evt_${randomToken(12)}`,
    type: input.data.outcome === "success" ? "payment.succeeded" : "payment.failed",
    data: { providerPaymentId: payment.providerPaymentId, amount: payment.amount, currency: payment.currency },
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    const headers = new Headers({ [MOCK_SIGNATURE_HEADER]: signMockWebhook(body) });
    const result = await handlePaymentWebhook("mock", body, headers);
    if (result.status < 500) {
      return result.status === 200 ? ok({ bookingId: payment.bookingId }) : fail("payment_failed");
    }
    await sleep(200 * 2 ** attempt);
  }
  return fail("payment_failed");
}
