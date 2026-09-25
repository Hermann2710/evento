import { mockProvider } from "./mock";
import type { PaymentProvider } from "./types";

const providers: Record<string, PaymentProvider> = {
  [mockProvider.name]: mockProvider,
};

export function getPaymentProvider(name: string): PaymentProvider | null {
  return providers[name] ?? null;
}

/** Active provider selected with PAYMENT_PROVIDER (defaults to the sandbox provider). */
export function activePaymentProvider(): PaymentProvider {
  return getPaymentProvider(process.env.PAYMENT_PROVIDER || "mock") ?? mockProvider;
}
