import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reviews, users } from "@/db/schema";

export async function listReviews(eventId: string, limit = 20) {
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      content: reviews.content,
      createdAt: reviews.createdAt,
      userId: reviews.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      image: users.image,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(and(eq(reviews.eventId, eventId), eq(reviews.hidden, false)))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

export async function getUserReview(userId: string, eventId: string) {
  const [row] = await db
    .select({ id: reviews.id, rating: reviews.rating, content: reviews.content })
    .from(reviews)
    .where(and(eq(reviews.userId, userId), eq(reviews.eventId, eventId)))
    .limit(1);
  return row ?? null;
}
