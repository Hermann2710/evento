"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { events, favorites } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok, type ActionResult } from "@/lib/result";

export async function toggleFavoriteAction(eventId: unknown): Promise<ActionResult<{ favorited: boolean }>> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  const id = z.uuid().safeParse(eventId);
  if (!id.success) return fail("invalid_input");
  if (!rateLimit(`fav:${user.id}`, 60, 60_000).ok) return fail("rate_limited");

  const removed = await db
    .delete(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.eventId, id.data)))
    .returning({ eventId: favorites.eventId });
  if (removed.length) return ok({ favorited: false });

  const [event] = await db.select({ id: events.id }).from(events).where(eq(events.id, id.data)).limit(1);
  if (!event) return fail("not_found");
  // Composite primary key (userId, eventId) guarantees uniqueness.
  await db.insert(favorites).values({ userId: user.id, eventId: id.data }).onConflictDoNothing();
  return ok({ favorited: true });
}
