export type CreatePaymentInput = {
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
  locale: string;
  customerEmail: string;
};

export type WebhookEventType = "payment.processing" | "payment.succeeded" | "payment.failed" | "payment.refunded";

export type ProviderWebhookEvent = {
  id: string;
  type: WebhookEventType;
  providerPaymentId: string;
  amount: number;
  currency: string;
  raw: Record<string, unknown>;
};

export class WebhookVerificationError extends Error {}

/**
 * Contract every payment provider must implement (Stripe, CinetPay, Flutterwave...).
 * The client can never declare a payment successful: only verified webhooks can.
 */
export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<{ providerPaymentId: string; redirectUrl: string }>;
  /** Must verify the signature and throw WebhookVerificationError when invalid. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<ProviderWebhookEvent>;
  refund(providerPaymentId: string, amount: number): Promise<void>;
}
