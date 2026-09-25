import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { totalPages } from "@/lib/utils";
import { listCategoryOptions } from "@/features/categories/queries";
import { listEvents } from "@/features/events/queries/list-events";
import { EventGrid } from "@/features/events/components/event-card";
import { SearchFilters } from "../components/search-filters";
import { toQueryRecord, type SearchParams } from "../validations";

const PAGE_SIZE = 12;

export async function SearchPage({ params }: { params: SearchParams }) {
  const [t, categories, result] = await Promise.all([
    getTranslations("search"),
    listCategoryOptions(),
    listEvents({ ...params, pageSize: PAGE_SIZE }),
  ]);
  const query = toQueryRecord(params);
  const filtersHref = `/search/filters?${new URLSearchParams(Object.entries(query).filter((e): e is [string, string] => Boolean(e[1]))).toString()}`;

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{params.q ? t("resultsFor", { query: params.q }) : t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500" role="status">{t("resultCount", { count: result.total })}</p>
        </div>
        <Link href={filtersHref} className={buttonClass({ variant: "outline", className: "lg:hidden" })}>
          {t("filters")}
        </Link>
      </div>
      <div className="flex gap-8">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-20 rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-semibold">{t("filters")}</h2>
            <SearchFilters params={params} categories={categories} />
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          {result.items.length ? (
            <>
              <EventGrid events={result.items} priorityCount={3} />
              <Pagination page={params.page} totalPages={totalPages(result.total, PAGE_SIZE)} pathname="/search" searchParams={query} />
            </>
          ) : (
            <EmptyState
              icon="🔎"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={<Link href="/search" className={buttonClass({ variant: "outline" })}>{t("reset")}</Link>}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export async function SearchFiltersPage({ params }: { params: SearchParams }) {
  const [t, categories] = await Promise.all([getTranslations("search"), listCategoryOptions()]);
  return (
    <div className="container-page max-w-lg py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("filters")}</h1>
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <SearchFilters params={params} categories={categories} />
      </div>
    </div>
  );
}
