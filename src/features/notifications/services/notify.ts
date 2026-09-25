import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users, type NotificationType } from "@/db/schema";
import { translate } from "@/lib/i18n/translate";
import { publish } from "@/lib/realtime/publish";
import { rooms, SOCKET_EVENTS } from "@/lib/realtime/events";
import { renderEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { absoluteUrl } from "@/lib/site";

export type NotificationKey =
  | "bookingConfirmed"
  | "paymentSucceeded"
  | "paymentFailed"
  | "eventCanceled"
  | "eventUpdated"
  | "contentHidden"
  | "accountStatus";

type NotifyInput = {
  userId: string;
  type: NotificationType;
  key: NotificationKey;
  params?: Record<string, string | number>;
  link?: string;
  email?: boolean;
};

/**
 * Persists a notification (rendered in the recipient's locale), pushes it in realtime
 * and optionally emails it. PostgreSQL stays the source of truth.
 */
export async function notify(input: NotifyInput): Promise<void> {
  const [user] = await db
    .select({ locale: users.locale, email: users.email })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!user) return;

  const params = input.params ?? {};
  const title = translate(user.locale, `notificationTemplates.${input.key}.title`, params);
  const message = translate(user.locale, `notificationTemplates.${input.key}.message`, params);
  const link = input.link ? `/${user.locale}${input.link}` : null;

  const [row] = await db
    .insert(notifications)
    .values({ userId: input.userId, type: input.type, title, message, link })
    .returning({ id: notifications.id });

  await publish(rooms.user(input.userId), SOCKET_EVENTS.notification, { id: row.id, title });

  if (input.email) {
    const mail = renderEmail("eventNotification", user.locale, { title, message }, link ? absoluteUrl(link) : undefined);
    await sendEmail({ to: user.email, ...mail });
  }
}

export async function notifyMany(userIds: string[], input: Omit<NotifyInput, "userId">): Promise<void> {
  await Promise.allSettled([...new Set(userIds)].map((userId) => notify({ ...input, userId })));
}
