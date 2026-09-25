"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { comments, events } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok, toFieldErrors, type ActionResult } from "@/lib/result";
import { createCommentSchema, updateCommentSchema } from "./validations";

const revalidate = () => revalidatePath("/[locale]/events/[slug]", "page");

export async function createCommentAction(values: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  const parsed = createCommentSchema.safeParse(values);
  if (!parsed.success) return fail("invalid_input", toFieldErrors(parsed.error.issues));
  if (!rateLimit(`comment:${user.id}`, 10, 60_000).ok) return fail("rate_limited");
  const [event] = await db.select({ status: events.status }).from(events).where(eq(events.id, parsed.data.eventId)).limit(1);
  if (!event || (event.status !== "published" && event.status !== "canceled")) return fail("not_found");
  await db.insert(comments).values({ userId: user.id, eventId: parsed.data.eventId, content: parsed.data.content });
  revalidate();
  return ok();
}

export async function updateCommentAction(values: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  const parsed = updateCommentSchema.safeParse(values);
  if (!parsed.success) return fail("invalid_input", toFieldErrors(parsed.error.issues));
  const updated = await db
    .update(comments)
    .set({ content: parsed.data.content })
    .where(and(eq(comments.id, parsed.data.id), eq(comments.userId, user.id)))
    .returning({ id: comments.id });
  if (!updated.length) return fail("not_found");
  revalidate();
  return ok();
}

export async function deleteCommentAction(commentId: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  const id = z.uuid().safeParse(commentId);
  if (!id.success) return fail("invalid_input");
  const where = user.role === "ADMIN" ? eq(comments.id, id.data) : and(eq(comments.id, id.data), eq(comments.userId, user.id));
  const deleted = await db.delete(comments).where(where).returning({ id: comments.id });
  if (!deleted.length) return fail("not_found");
  revalidate();
  return ok();
}
