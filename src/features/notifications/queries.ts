import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
};

export async function listNotifications(
  userId: string,
  opts: { page?: number; pageSize?: number; unreadOnly?: boolean } = {},
): Promise<{ items: NotificationItem[]; total: number }> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const where = opts.unreadOnly
    ? and(eq(notifications.userId, userId), eq(notifications.read, false))
    : eq(notifications.userId, userId);
  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: notifications.id,
        title: notifications.title,
        message: notifications.message,
        link: notifications.link,
        read: notifications.read,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(notifications).where(where),
  ]);
  return { items, total };
}

export async function countUnread(userId: string): Promise<number> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return total;
}
