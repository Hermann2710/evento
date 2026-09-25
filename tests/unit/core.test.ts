import { describe, expect, it } from "vitest";
import { computeTotals } from "@/lib/pricing";
import { utcToZonedLocal, zonedLocalToUtc } from "@/lib/format";
import { sha256, signPayload, verifyPayload } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { isAllowedImageUrl } from "@/lib/cloudinary";
import { verifyTicketPayload, ticketPayload } from "@/lib/qrcode";
import { translate } from "@/lib/i18n/translate";
import { mockProvider, signMockWebhook, MOCK_SIGNATURE_HEADER } from "@/features/payments/providers/mock";

describe("pricing", () => {
  it("computes subtotal, 5% fees and total in minor units", () => {
    expect(computeTotals([{ unitPrice: 1000, quantity: 2 }, { unitPrice: 500, quantity: 1 }])).toEqual({ subtotal: 2500, fees: 125, total: 2625 });
  });
  it("charges no fees for free bookings", () => {
    expect(computeTotals([{ unitPrice: 0, quantity: 3 }])).toEqual({ subtotal: 0, fees: 0, total: 0 });
  });
});

describe("timezones", () => {
  it("converts wall-clock time in a timezone to UTC and back", () => {
    const utc = zonedLocalToUtc("2030-05-01T20:00", "Africa/Douala")!;
    expect(utc.toISOString()).toBe("2030-05-01T19:00:00.000Z");
    expect(utcToZonedLocal(utc, "Africa/Douala")).toBe("2030-05-01T20:00");
  });
  it("handles DST", () => {
    expect(zonedLocalToUtc("2030-07-01T12:00", "Europe/Paris")!.toISOString()).toBe("2030-07-01T10:00:00.000Z");
    expect(zonedLocalToUtc("2030-01-01T12:00", "Europe/Paris")!.toISOString()).toBe("2030-01-01T11:00:00.000Z");
  });
});

describe("tokens", () => {
  it("signs and verifies payloads, rejects tampering and expiry", () => {
    const token = signPayload("s", { uid: "u1", exp: Date.now() + 1000 });
    expect(verifyPayload<{ uid: string; exp: number }>("s", token)?.uid).toBe("u1");
    expect(verifyPayload("other", token)).toBeNull();
    expect(verifyPayload("s", token.replace(/.$/, "0"))).toBeNull();
    expect(verifyPayload("s", signPayload("s", { exp: Date.now() - 1 }))).toBeNull();
  });
  it("hashes deterministically", () => {
    expect(sha256("abc")).toHaveLength(64);
    expect(sha256("abc")).toBe(sha256("abc"));
  });
});

describe("rate limiting", () => {
  it("blocks after the limit", () => {
    const key = `test:${Math.random()}`;
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(false);
  });
});

describe("uploads & tickets security", () => {
  it("accepts only https image URLs when Cloudinary is not configured", () => {
    expect(isAllowedImageUrl("https://example.com/a.jpg", "u1")).toBe(true);
    expect(isAllowedImageUrl("http://example.com/a.jpg", "u1")).toBe(false);
    expect(isAllowedImageUrl("javascript:alert(1)", "u1")).toBe(false);
  });
  it("detects forged ticket QR payloads", () => {
    expect(verifyTicketPayload(ticketPayload("EVT-ABC"))).toBe("EVT-ABC");
    expect(verifyTicketPayload("EVT-ABC.deadbeef")).toBeNull();
  });
});

describe("i18n translate", () => {
  it("interpolates params in both locales", () => {
    expect(translate("en", "emails.welcome.heading", { name: "Ada" })).toBe("Welcome, Ada!");
    expect(translate("fr", "emails.welcome.heading", { name: "Ada" })).toBe("Bienvenue, Ada !");
    expect(translate("fr", "missing.key")).toBe("missing.key");
  });
});

describe("payment webhook signature", () => {
  const body = JSON.stringify({ id: "evt_1", type: "payment.succeeded", data: { providerPaymentId: "mock_1", amount: 1000, currency: "XAF" } });
  it("accepts a valid signature", async () => {
    const event = await mockProvider.verifyWebhook(body, new Headers({ [MOCK_SIGNATURE_HEADER]: signMockWebhook(body) }));
    expect(event).toMatchObject({ id: "evt_1", type: "payment.succeeded", amount: 1000 });
  });
  it("rejects invalid, tampered or stale signatures", async () => {
    await expect(mockProvider.verifyWebhook(body, new Headers({ [MOCK_SIGNATURE_HEADER]: "t=1,v1=abc" }))).rejects.toThrow();
    await expect(mockProvider.verifyWebhook(body.replace("1000", "1"), new Headers({ [MOCK_SIGNATURE_HEADER]: signMockWebhook(body) }))).rejects.toThrow();
    const stale = signMockWebhook(body, Math.floor(Date.now() / 1000) - 3600);
    await expect(mockProvider.verifyWebhook(body, new Headers({ [MOCK_SIGNATURE_HEADER]: stale }))).rejects.toThrow();
  });
});
