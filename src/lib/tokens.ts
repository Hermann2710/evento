import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSha256(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Compact signed token: base64url(json).hmac — used for realtime auth. */
export function signPayload(secret: string, payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmacSha256(secret, body)}`;
}

export function verifyPayload<T extends { exp: number }>(secret: string, token: string): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, hmacSha256(secret, body))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    return typeof data.exp === "number" && data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
