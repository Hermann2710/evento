export const PLATFORM_FEE_RATE = 0.05;
export const MAX_TICKETS_PER_TYPE = 10;
export const MAX_TICKETS_PER_BOOKING = 20;
export const BOOKING_HOLD_MINUTES = 15;
export const SUPPORTED_CURRENCIES = ["XAF", "EUR", "USD"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export type PriceLine = { unitPrice: number; quantity: number };

/** Server-side source of truth for booking totals (minor units). */
export function computeTotals(lines: PriceLine[]): { subtotal: number; fees: number; total: number } {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const fees = subtotal === 0 ? 0 : Math.round(subtotal * PLATFORM_FEE_RATE);
  return { subtotal, fees, total: subtotal + fees };
}
