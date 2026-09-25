import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/guards";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { PageHeading } from "@/components/layout/dashboard-shell";
import { cn, totalPages } from "@/lib/utils";
import { countUnread, listNotifications } from "../queries";
import { NotificationList } from "../components/notification-list";

const PAGE_SIZE = 15;

export async function NotificationsPage({ filter, page }: { filter: "all" | "unread"; page: number }) {
  const user = await requireUser();
  const [t, { items, total }, unread] = await Promise.all([
    getTranslations("notifications"),
    listNotifications(user.id, { page, pageSize: PAGE_SIZE, unreadOnly: filter === "unread" }),
    countUnread(user.id),
  ]);

  const tabClass = (active: boolean) =>
    cn("rounded-full px-4 py-1.5 text-sm font-medium", active ? "bg-brand-600 text-white" : "bg-white text-gray-600 border border-gray-200");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading title={t("title")} description={t("unreadCount", { count: unread })} />
      <div className="mb-4 flex gap-2" role="group" aria-label={t("filter")}>
        <Link href="/notifications" className={tabClass(filter === "all")} aria-current={filter === "all" ? "page" : undefined}>
          {t("all")}
        </Link>
        <Link href="/notifications?filter=unread" className={tabClass(filter === "unread")} aria-current={filter === "unread" ? "page" : undefined}>
          {t("unreadTab")}
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState icon="🔔" title={t("empty")} description={t("emptyDescription")} />
      ) : (
        <NotificationList items={items} hasUnread={unread > 0} />
      )}
      <Pagination page={page} totalPages={totalPages(total, PAGE_SIZE)} pathname="/notifications" searchParams={{ filter: filter === "unread" ? "unread" : undefined }} />
    </div>
  );
}
