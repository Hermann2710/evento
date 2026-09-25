import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { Avatar } from "@/components/ui/display";
import { EmptyState } from "@/components/ui/states";
import { SmartImage } from "@/components/ui/smart-image";
import { listCategories } from "@/features/categories/queries";
import { listTopOrganizers } from "@/features/organizer/queries/public";
import { listEvents } from "../queries/list-events";
import { EventGrid } from "../components/event-card";
import { CategoryChips, Section } from "../components/section";

const HERO_IMAGE = "https://images.pexels.com/photos/36675302/pexels-photo-36675302.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1800";

export async function HomePage() {
  const [t, locale, featured, upcoming, popular, categories, organizers] = await Promise.all([
    getTranslations("home"),
    getLocale(),
    listEvents({ featured: true, pageSize: 4 }),
    listEvents({ sort: "date", pageSize: 8 }),
    listEvents({ sort: "popular", pageSize: 4 }),
    listCategories(),
    listTopOrganizers(6),
  ]);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-gray-900">
        <SmartImage src={HERO_IMAGE} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-40" />
        <div className="container-page py-20 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-200">{t("heroEyebrow")}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl">{t("heroTitle")}</h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-200">{t("heroSubtitle")}</p>
          <form action={`/${locale}/search`} method="get" role="search" className="mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl sm:flex-row">
            <label htmlFor="hero-q" className="sr-only">{t("searchLabel")}</label>
            <input id="hero-q" name="q" type="search" placeholder={t("searchPlaceholder")} className="h-12 flex-1 rounded-xl px-4 text-gray-900 focus:outline-none" />
            <label htmlFor="hero-city" className="sr-only">{t("cityLabel")}</label>
            <input id="hero-city" name="city" placeholder={t("cityPlaceholder")} className="h-12 rounded-xl border-gray-200 px-4 text-gray-900 focus:outline-none sm:w-44 sm:border-l" />
            <button type="submit" className={buttonClass({ size: "lg" })}>{t("searchButton")}</button>
          </form>
        </div>
      </section>

      <Section id="featured" title={t("featuredTitle")} description={t("featuredDescription")} href="/discover" linkLabel={t("seeAll")}>
        {featured.items.length || popular.items.length ? (
          <EventGrid events={featured.items.length ? featured.items : popular.items} priorityCount={2} />
        ) : (
          <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
        )}
      </Section>

      <Section id="categories" title={t("categoriesTitle")}>
        <CategoryChips categories={categories} />
      </Section>

      {upcoming.items.length > 0 && (
        <Section id="upcoming" title={t("upcomingTitle")} href="/search?sort=date" linkLabel={t("seeAll")}>
          <EventGrid events={upcoming.items} />
        </Section>
      )}

      {popular.items.length > 0 && (
        <Section id="popular" title={t("popularTitle")} href="/search?sort=popular" linkLabel={t("seeAll")}>
          <EventGrid events={popular.items} />
        </Section>
      )}

      {organizers.length > 0 && (
        <Section id="organizers" title={t("organizersTitle")} description={t("organizersDescription")}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {organizers.map((o) => (
              <li key={o.id} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4">
                <Avatar src={o.image} firstName={o.name} alt={o.name} size={48} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{o.name}</p>
                  <p className="text-sm text-gray-500">{t("organizerEvents", { count: o.eventCount })}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <section className="container-page py-10">
        <div className="rounded-3xl bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-3xl font-bold">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">{t("ctaDescription")}</p>
          <Link href="/onboarding" className={buttonClass({ variant: "secondary", size: "lg", className: "mt-6 bg-white" })}>
            {t("ctaButton")}
          </Link>
        </div>
      </section>
    </>
  );
}
