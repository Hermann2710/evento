import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as typeof globalThis & { __eventoRateLimit?: Map<string, Bucket> };
const store: Map<string, Bucket> = globalStore.__eventoRateLimit ?? new Map();
globalStore.__eventoRateLimit = store;

/**
 * Fixed-window in-memory rate limiter. Suitable for a single instance;
 * swap for Redis/Upstash when running multiple instances.
 */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number } {
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    if (store.size > 10_000) {
      for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
    }
    return { ok: true, remaining: limit - 1 };
  }
  bucket.count += 1;
  return { ok: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count) };
}

export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

export async function limitByIp(scope: string, limit: number, windowMs: number): Promise<boolean> {
  const ip = await clientIp();
  return rateLimit(`${scope}:${ip}`, limit, windowMs).ok;
}
