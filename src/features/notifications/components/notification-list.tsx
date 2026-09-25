"use client";

import { useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import { cn } from "@/lib/utils";
import { markAllNotificationsReadAction, markNotificationReadAction } from "../actions";
import type { NotificationItem } from "../queries";

export function NotificationList({ items, hasUnread }: { items: NotificationItem[]; hasUnread: boolean }) {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    router.refresh();
  };

  return (
    <div className="space-y-3">
      {hasUnread && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                await markAllNotificationsReadAction();
                toast.success(t("allMarked"));
                refresh();
              })
            }
          >
            {t("markAllRead")}
          </Button>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id}>
            <Card className={cn("flex items-start gap-3 p-4", !n.read && "border-brand-200 bg-brand-50/40")}>
              <span aria-hidden="true" className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", n.read ? "bg-gray-300" : "bg-brand-600")} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">
                  {n.title}
                  {!n.read && <span className="sr-only"> — {t("unread")}</span>}
                </p>
                <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <time dateTime={new Date(n.createdAt).toISOString()}>{format.relativeTime(new Date(n.createdAt))}</time>
                  {n.link && (
                    <Link href={n.link.replace(/^\/(fr|en)/, "")} className="font-medium text-brand-700 hover:underline">
                      {t("open")}
                    </Link>
                  )}
                </div>
              </div>
              {!n.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startTransition(async () => {
                    await markNotificationReadAction(n.id);
                    refresh();
                  })}
                >
                  {t("markRead")}
                </Button>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
