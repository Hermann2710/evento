"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok, toFieldErrors, type ActionResult } from "@/lib/result";
import { reviewSchema } from "./validations";
import { reviewEligibility } from "./services";

export async function upsertReviewAction(values: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  const parsed = reviewSchema.safeParse(values);
  if (!parsed.success) return fail("invalid_input", toFieldErrors(parsed.error.issues));
  if (!rateLimit(`review:${user.id}`, 10, 60_000).ok) return fail("rate_limited");

  const eligibility = await reviewEligibility(user.id, parsed.data.eventId);
  if (!eligibility.allowed) return fail(eligibility.reason ?? "forbidden");

  await db
    .insert(reviews)
    .values({ userId: user.id, eventId: parsed.data.eventId, rating: parsed.data.rating, content: parsed.data.content })
    .onConflictDoUpdate({
      target: [reviews.userId, reviews.eventId],
      set: { rating: parsed.data.rating, content: parsed.data.content, updatedAt: new Date() },
    });
  revalidatePath("/[locale]/events/[slug]", "page");
  return ok();
}

export async function deleteReviewAction(reviewId: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized");
  const id = z.uuid().safeParse(reviewId);
  if (!id.success) return fail("invalid_input");
  const where = user.role === "ADMIN" ? eq(reviews.id, id.data) : and(eq(reviews.id, id.data), eq(reviews.userId, user.id));
  const deleted = await db.delete(reviews).where(where).returning({ id: reviews.id });
  if (!deleted.length) return fail("not_found");
  revalidatePath("/[locale]/events/[slug]", "page");
  return ok();
}
