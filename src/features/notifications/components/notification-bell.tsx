"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Dropdown, menuItemClass } from "@/components/ui/dropdown";
import { useSocketContext } from "@/providers/socket-provider";
import { markAllNotificationsReadAction } from "../actions";

type BellData = {
  unread: number;
  items: Array<{ id: string; title: string; message: string; link: string | null; read: boolean; createdAt: string }>;
};

export function NotificationBell() {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const queryClient = useQueryClient();
  const { connected } = useSocketContext();

  const { data } = useQuery<BellData>({
    queryKey: ["notifications", "bell"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=6", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    // Realtime pushes invalidate the query; poll only as a fallback.
    refetchInterval: connected ? false : 30_000,
  });

  const unread = data?.unread ?? 0;

  return (
    <Dropdown
      label={unread > 0 ? t("bellUnread", { count: unread }) : t("bell")}
      triggerClassName="relative h-10 w-10 justify-center hover:bg-gray-100"
      trigger={
        <>
          <span aria-hidden="true" className="text-lg">🔔</span>
          {unread > 0 && (
            <span aria-hidden="true" className="absolute right-1 top-1 min-w-4 rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </>
      }
    >
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-sm font-semibold">{t("title")}</p>
        {unread > 0 && (
          <button
            type="button"
            role="menuitem"
            className="text-xs font-medium text-brand-700 hover:underline"
            onClick={async () => {
              await markAllNotificationsReadAction();
              queryClient.invalidateQueries({ queryKey: ["notifications"] });
            }}
          >
            {t("markAllRead")}
          </button>
        )}
      </div>
      <div className="max-h-80 w-80 overflow-y-auto">
        {data?.items.length ? (
          data.items.map((n) => (
            <Link key={n.id} role="menuitem" href={n.link?.replace(/^\/(fr|en)/, "") || "/notifications"} className={`${menuItemClass} flex-col items-start`}>
              <span className="flex w-full items-center gap-2">
                {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label={t("unread")} />}
                <span className="truncate font-medium">{n.title}</span>
              </span>
              <span className="line-clamp-2 text-xs text-gray-500">{n.message}</span>
              <span className="text-[11px] text-gray-400">{format.relativeTime(new Date(n.createdAt))}</span>
            </Link>
          ))
        ) : (
          <p className="px-3 py-6 text-center text-sm text-gray-500">{t("empty")}</p>
        )}
      </div>
      <Link role="menuitem" href="/notifications" className={`${menuItemClass} justify-center font-medium text-brand-700`}>
        {t("viewAll")}
      </Link>
    </Dropdown>
  );
}
