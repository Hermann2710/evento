export function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function secret(name: "AUTH_SECRET" | "PAYMENT_WEBHOOK_SECRET" | "REALTIME_SECRET"): string {
  const value = process.env[name] || process.env.AUTH_SECRET;
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}
