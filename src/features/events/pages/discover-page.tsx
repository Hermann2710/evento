import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, favorites } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/guards";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { totalPages } from "@/lib/utils";
import { listCategories } from "@/features/categories/queries";
import { listEvents } from "../queries/list-events";
import { EventGrid } from "../components/event-card";
import { CategoryChips, Section } from "../components/section";

const PAGE_SIZE = 12;

async function favoriteCategoryIds(userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ categoryId: events.categoryId })
    .from(favorites)
    .innerJoin(events, eq(events.id, favorites.eventId))
    .where(eq(favorites.userId, userId));
  return rows.map((r) => r.categoryId).filter((id): id is string => Boolean(id));
}

export async function DiscoverPage({ page }: { page: number }) {
  const user = await getCurrentUser();
  const categoryIds = user ? await favoriteCategoryIds(user.id) : [];
  const [t, popular, upcoming, categories, recommended] = await Promise.all([
    getTranslations("discover"),
    listEvents({ sort: "popular", pageSize: 4 }),
    listEvents({ sort: "date", page, pageSize: PAGE_SIZE }),
    listCategories(),
    categoryIds.length ? listEvents({ categoryIds, sort: "popular", pageSize: 4 }) : listEvents({ featured: true, pageSize: 4 }),
  ]);

  return (
    <>
      <div className="container-page pt-10">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-gray-500">{t("subtitle")}</p>
      </div>

      <Section id="discover-categories" title={t("categories")}>
        <CategoryChips categories={categories} />
      </Section>

      {page === 1 && recommended.items.length > 0 && (
        <Section id="recommended" title={t("recommended")} description={user ? t("recommendedForYou") : t("recommendedGeneric")}>
          <EventGrid events={recommended.items} />
        </Section>
      )}

      {page === 1 && popular.items.length > 0 && (
        <Section id="popular" title={t("popular")} href="/search?sort=popular" linkLabel={t("seeAll")}>
          <EventGrid events={popular.items} priorityCount={2} />
        </Section>
      )}

      <Section id="upcoming" title={t("upcoming")}>
        {upcoming.items.length ? (
          <>
            <EventGrid events={upcoming.items} />
            <Pagination page={page} totalPages={totalPages(upcoming.total, PAGE_SIZE)} pathname="/discover" />
          </>
        ) : (
          <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
        )}
      </Section>
    </>
  );
}
