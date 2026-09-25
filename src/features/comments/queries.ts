import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comments, users } from "@/db/schema";

export const COMMENTS_PAGE_SIZE = 10;

export async function listComments(eventId: string, page = 1) {
  const where = and(eq(comments.eventId, eventId), eq(comments.hidden, false));
  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        userId: comments.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        image: users.image,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .where(where)
      .orderBy(desc(comments.createdAt))
      .limit(COMMENTS_PAGE_SIZE)
      .offset((page - 1) * COMMENTS_PAGE_SIZE),
    db.select({ total: count() }).from(comments).where(where),
  ]);
  return { items, total };
}

export type CommentItemData = Awaited<ReturnType<typeof listComments>>["items"][number];
