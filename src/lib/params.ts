import { notFound } from "next/navigation";

export type SP = Record<string, string | string[] | undefined>;

export function spFirst(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function pageParam(sp: SP, key = "page"): number {
  const n = Number(spFirst(sp[key]));
  return Number.isInteger(n) && n > 0 && n < 10_000 ? n : 1;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Rejects malformed ids early (404) instead of letting the database throw. */
export function assertUuid(value: string): string {
  if (!isUuid(value)) notFound();
  return value;
}
