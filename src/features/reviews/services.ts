import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, events } from "@/db/schema";
import type { ErrorCode } from "@/lib/result";

/** Business rule: only attendees (confirmed booking) can review, once the event has started. */
export async function reviewEligibility(userId: string, eventId: string): Promise<{ allowed: boolean; reason?: ErrorCode }> {
  const [event] = await db.select({ startDate: events.startDate, status: events.status }).from(events).where(eq(events.id, eventId)).limit(1);
  if (!event || event.status === "draft" || event.status === "hidden") return { allowed: false, reason: "not_found" };
  const [booking] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.userId, userId), eq(bookings.eventId, eventId), eq(bookings.status, "confirmed")))
    .limit(1);
  if (!booking) return { allowed: false, reason: "not_attendee" };
  if (event.startDate.getTime() > Date.now()) return { allowed: false, reason: "event_not_started" };
  return { allowed: true };
}
