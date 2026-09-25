"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { fail, ok, type ActionResult } from "@/lib/result";

export async function markNotificationReadAction(id: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return fail("invalid_input");
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, parsed.data), eq(notifications.userId, user.id)));
  return ok();
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
  return ok();
}
