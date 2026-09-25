/** Money is stored in minor units (x100). */
export function toMinor(amount: number): number {
  return Math.round(amount * 100);
}

export function fromMinor(amount: number): number {
  return amount / 100;
}

export function formatMoney(amountMinor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(fromMinor(amountMinor));
}

export function formatDateTime(date: Date, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

export function formatDate(date: Date, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone }).format(date);
}

export function formatTime(date: Date, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone }).format(date);
}

export function formatShortDate(date: Date, locale: string, timeZone?: string): { day: string; month: string } {
  const day = new Intl.DateTimeFormat(locale, { day: "2-digit", timeZone }).format(date);
  const month = new Intl.DateTimeFormat(locale, { month: "short", timeZone }).format(date);
  return { day, month };
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function zonedParts(date: Date, timeZone: string): Record<string, number> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const out: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") out[p.type] = Number(p.value);
  return out;
}

function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converts a "YYYY-MM-DDTHH:mm" wall-clock value in `timeZone` to a UTC Date. */
export function zonedLocalToUtc(local: string, timeZone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const first = guess - offsetMs(new Date(guess), timeZone);
  const second = guess - offsetMs(new Date(first), timeZone);
  return new Date(second);
}

/** Converts a UTC Date to a "YYYY-MM-DDTHH:mm" wall-clock value in `timeZone`. */
export function utcToZonedLocal(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}
