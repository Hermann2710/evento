import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, organizers } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/guards";

export async function getOrganizerForUser(userId: string) {
  const [row] = await db.select().from(organizers).where(eq(organizers.userId, userId)).limit(1);
  return row ?? null;
}

/** Returns the event only if the user owns it (via their organizer profile) or is ADMIN. */
export async function getOwnedEvent(user: Pick<CurrentUser, "id" | "role">, eventId: string) {
  if (user.role === "ADMIN") {
    const [row] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    return row ?? null;
  }
  const [row] = await db
    .select({ event: events })
    .from(events)
    .innerJoin(organizers, eq(organizers.id, events.organizerId))
    .where(and(eq(events.id, eventId), eq(organizers.userId, user.id)))
    .limit(1);
  return row?.event ?? null;
}
