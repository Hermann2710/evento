import { z } from "zod";
import { hmacSha256, randomToken, safeEqual } from "@/lib/tokens";
import { secret } from "@/lib/site";
import { WebhookVerificationError, type PaymentProvider, type ProviderWebhookEvent } from "./types";

export const MOCK_SIGNATURE_HEADER = "x-evento-signature";
const TOLERANCE_SECONDS = 300;

const payloadSchema = z.object({
  id: z.string().min(1).max(128),
  type: z.enum(["payment.processing", "payment.succeeded", "payment.failed", "payment.refunded"]),
  data: z.object({
    providerPaymentId: z.string().min(1).max(128),
    amount: z.number().int().nonnegative(),
    currency: z.string().length(3),
  }),
});

export function signMockWebhook(body: string, timestamp = Math.floor(Date.now() / 1000)): string {
  return `t=${timestamp},v1=${hmacSha256(secret("PAYMENT_WEBHOOK_SECRET"), `${timestamp}.${body}`)}`;
}

/**
 * Sandbox provider with a hosted payment page (/checkout/[id]/pay) and Stripe-style
 * signed webhooks (HMAC-SHA256 over `timestamp.body`, replay protection).
 */
export const mockProvider: PaymentProvider = {
  name: "mock",

  async createPayment(input) {
    return {
      providerPaymentId: `mock_${randomToken(16)}`,
      redirectUrl: `/${input.locale}/checkout/${input.bookingId}/pay?payment=${input.paymentId}`,
    };
  },

  async verifyWebhook(rawBody, headers): Promise<ProviderWebhookEvent> {
    const header = headers.get(MOCK_SIGNATURE_HEADER) ?? "";
    const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
    const timestamp = Number(parts.t);
    if (!timestamp || !parts.v1) throw new WebhookVerificationError("missing signature");
    if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) throw new WebhookVerificationError("stale signature");
    const expected = hmacSha256(secret("PAYMENT_WEBHOOK_SECRET"), `${timestamp}.${rawBody}`);
    if (!safeEqual(expected, parts.v1)) throw new WebhookVerificationError("invalid signature");

    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      throw new WebhookVerificationError("invalid json");
    }
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) throw new WebhookVerificationError("invalid payload");
    return {
      id: parsed.data.id,
      type: parsed.data.type,
      providerPaymentId: parsed.data.data.providerPaymentId,
      amount: parsed.data.data.amount,
      currency: parsed.data.data.currency,
      raw: parsed.data as unknown as Record<string, unknown>,
    };
  },

  async refund() {
    // Sandbox: refunds are accepted immediately.
  },
};
