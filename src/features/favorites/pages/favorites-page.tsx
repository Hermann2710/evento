import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/guards";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { PageHeading } from "@/components/layout/dashboard-shell";
import { EventGrid } from "@/features/events/components/event-card";
import { listFavorites } from "../queries";

export async function FavoritesPage() {
  const user = await requireUser();
  const [t, items] = await Promise.all([getTranslations("favorites"), listFavorites(user.id)]);
  return (
    <div>
      <PageHeading title={t("title")} description={t("subtitle")} />
      {items.length === 0 ? (
        <EmptyState icon="❤️" title={t("emptyTitle")} description={t("emptyDescription")} action={<Link href="/discover" className={buttonClass()}>{t("explore")}</Link>} />
      ) : (
        <EventGrid events={items} />
      )}
    </div>
  );
}
