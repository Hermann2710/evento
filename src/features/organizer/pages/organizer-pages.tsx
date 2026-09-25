import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { eventImages, ticketTypes } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { requireRole, requireUser } from "@/lib/auth/guards";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card, StatCard, statusTone } from "@/components/ui/display";
import { EmptyState } from "@/components/ui/states";
import { PageHeading } from "@/components/layout/dashboard-shell";
import { formatDate, formatDateTime, formatMoney, fromMinor, utcToZonedLocal } from "@/lib/format";
import { listCategoryOptions } from "@/features/categories/queries";
import { EventForm } from "@/features/events/components/event-form";
import { EventStatusActions } from "@/features/events/components/event-status-actions";
import { getOrganizerForUser, getOwnedEvent } from "@/features/events/services/ownership";
import type { EventFormValues } from "@/features/events/validations/event-form";
import type { Currency } from "@/lib/pricing";
import { listOrganizerBookings, listOrganizerEvents, organizerStats } from "../queries/dashboard";
import { OrganizerProfileForm } from "../components/organizer-profile-form";

async function NeedsProfile() {
  const t = await getTranslations("organizer");
  return (
    <EmptyState icon="🏢" title={t("needsProfileTitle")} description={t("needsProfileDescription")} action={<Link href="/organizer/profile" className={buttonClass()}>{t("createProfile")}</Link>} />
  );
}

export async function OrganizerDashboardPage() {
  const user = await requireRole(["ORGANIZER", "ADMIN"]);
  const organizer = await getOrganizerForUser(user.id);
  if (!organizer) return <NeedsProfile />;
  const [t, ts, locale, stats, eventsList, recent] = await Promise.all([
    getTranslations("organizer"),
    getTranslations("status"),
    getLocale(),
    organizerStats(organizer.id),
    listOrganizerEvents(organizer.id),
    listOrganizerBookings(organizer.id, { limit: 8 }),
  ]);
  const revenue = stats.revenue.length ? stats.revenue.map((r) => formatMoney(r.amount, r.currency, locale)).join(" · ") : formatMoney(0, "XAF", locale);

  return (
    <div className="space-y-6">
      <PageHeading title={t("dashboardTitle", { name: organizer.name })} description={t("dashboardSubtitle")} action={<Link href="/organizer/events/new" className={buttonClass()}>{t("nav.create")}</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("stats.events")} value={stats.totalEvents} hint={t("stats.published", { count: stats.events.published ?? 0 })} />
        <StatCard label={t("stats.bookings")} value={stats.confirmedBookings} />
        <StatCard label={t("stats.tickets")} value={stats.ticketsSold} />
        <StatCard label={t("stats.revenue")} value={revenue} hint={t("stats.revenueHint")} />
      </div>
      <Card>
        <div className="border-b border-gray-100 p-5"><h2 className="font-semibold">{t("salesByEvent")}</h2></div>
        {eventsList.length === 0 ? (
          <div className="p-5"><EmptyState icon="📅" title={t("noEvents")} /></div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {eventsList.slice(0, 6).map((e) => {
              const pct = e.capacity ? Math.min(100, Math.round((e.sold / e.capacity) * 100)) : 0;
              return (
                <li key={e.id} className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/organizer/events/${e.id}`} className="font-medium hover:underline">{e.title}</Link>
                    <Badge tone={statusTone(e.status)}>{ts(`event.${e.status}`)}</Badge>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("fillRate")}>
                    <div className="h-full bg-brand-600" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{t("soldOf", { sold: e.sold, capacity: e.capacity })} · {formatMoney(e.revenue, e.currency ?? "XAF", locale)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <BookingsTable title={t("recentBookings")} rows={recent} locale={locale} />
    </div>
  );
}

async function BookingsTable({ title, rows, locale }: { title: string; rows: Awaited<ReturnType<typeof listOrganizerBookings>>; locale: string }) {
  const [t, ts] = await Promise.all([getTranslations("organizer"), getTranslations("status")]);
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-gray-100 p-5"><h2 className="font-semibold">{title}</h2></div>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-gray-500">{t("noBookings")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th scope="col" className="px-5 py-2">{t("table.customer")}</th>
                <th scope="col" className="px-5 py-2">{t("table.event")}</th>
                <th scope="col" className="px-5 py-2">{t("table.tickets")}</th>
                <th scope="col" className="px-5 py-2">{t("table.amount")}</th>
                <th scope="col" className="px-5 py-2">{t("table.status")}</th>
                <th scope="col" className="px-5 py-2">{t("table.date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((b) => (
                <tr key={b.id}>
                  <td className="px-5 py-3"><span className="font-medium">{b.firstName} {b.lastName}</span><span className="block text-xs text-gray-500">{b.email}</span></td>
                  <td className="px-5 py-3">{b.eventTitle}</td>
                  <td className="px-5 py-3">{b.ticketCount}</td>
                  <td className="px-5 py-3">{formatMoney(b.subtotal, b.currency, locale)}</td>
                  <td className="px-5 py-3"><Badge tone={statusTone(b.status)}>{ts(`booking.${b.status}`)}</Badge></td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(b.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export async function OrganizerEventsPage() {
  const user = await requireRole(["ORGANIZER", "ADMIN"]);
  const organizer = await getOrganizerForUser(user.id);
  if (!organizer) return <NeedsProfile />;
  const [t, ts, locale, list] = await Promise.all([getTranslations("organizer"), getTranslations("status"), getLocale(), listOrganizerEvents(organizer.id)]);
  return (
    <div>
      <PageHeading title={t("eventsTitle")} action={<Link href="/organizer/events/new" className={buttonClass()}>{t("nav.create")}</Link>} />
      {list.length === 0 ? (
        <EmptyState icon="📅" title={t("noEvents")} description={t("noEventsDescription")} action={<Link href="/organizer/events/new" className={buttonClass()}>{t("nav.create")}</Link>} />
      ) : (
        <ul className="space-y-3">
          {list.map((e) => (
            <li key={e.id}>
              <Card className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{e.title}</p>
                    <p className="text-sm text-gray-500">{formatDateTime(e.startDate, locale, e.timezone)} · {t("soldOf", { sold: e.sold, capacity: e.capacity })}</p>
                  </div>
                  <Badge tone={statusTone(e.status)}>{ts(`event.${e.status}`)}</Badge>
                </div>
                <EventStatusActions eventId={e.id} status={e.status} slug={e.slug} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export async function NewEventPage() {
  const user = await requireRole(["ORGANIZER", "ADMIN"]);
  const organizer = await getOrganizerForUser(user.id);
  if (!organizer) return <NeedsProfile />;
  const [t, categories] = await Promise.all([getTranslations("organizer"), listCategoryOptions()]);
  return (
    <div className="max-w-3xl">
      <PageHeading title={t("newEventTitle")} description={t("newEventSubtitle")} />
      <EventForm categories={categories} />
    </div>
  );
}

export async function EditEventPage({ eventId }: { eventId: string }) {
  const user = await requireRole(["ORGANIZER", "ADMIN"]);
  const event = await getOwnedEvent(user, eventId);
  if (!event) notFound();
  const [t, categories, types, images] = await Promise.all([
    getTranslations("organizer"),
    listCategoryOptions(),
    db.select().from(ticketTypes).where(eq(ticketTypes.eventId, event.id)).orderBy(asc(ticketTypes.createdAt)),
    db.select().from(eventImages).where(eq(eventImages.eventId, event.id)).orderBy(asc(eventImages.position)),
  ]);
  const local = (d: Date | null) => (d ? utcToZonedLocal(d, event.timezone) : "");
  const initial: EventFormValues = {
    title: event.title,
    description: event.description,
    categoryId: event.categoryId ?? "",
    coverImage: event.coverImage ?? "",
    gallery: images.map((i) => i.url),
    location: event.location,
    city: event.city,
    country: event.country,
    startDate: local(event.startDate),
    endDate: local(event.endDate),
    timezone: event.timezone,
    capacity: event.capacity,
    currency: (types[0]?.currency ?? "XAF") as Currency,
    ticketTypes: types.map((tt) => ({
      id: tt.id,
      name: tt.name,
      description: tt.description ?? "",
      price: fromMinor(tt.price),
      quantity: tt.quantity,
      salesStart: local(tt.salesStart),
      salesEnd: local(tt.salesEnd),
    })),
  };
  return (
    <div className="max-w-3xl">
      <PageHeading title={t("editEventTitle")} description={event.title} />
      <EventForm categories={categories} initial={initial} eventId={event.id} />
    </div>
  );
}

export async function OrganizerEventDetailPage({ eventId }: { eventId: string }) {
  const user = await requireRole(["ORGANIZER", "ADMIN"]);
  const event = await getOwnedEvent(user, eventId);
  if (!event) notFound();
  const [t, locale, rows, types] = await Promise.all([
    getTranslations("organizer"),
    getLocale(),
    listOrganizerBookings(event.organizerId, { eventId: event.id, limit: 200 }),
    db.select().from(ticketTypes).where(eq(ticketTypes.eventId, event.id)),
  ]);
  return (
    <div className="space-y-6">
      <PageHeading title={event.title} description={formatDateTime(event.startDate, locale, event.timezone)} action={<EventStatusActions eventId={event.id} status={event.status} slug={event.slug} />} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {types.map((tt) => (
          <StatCard key={tt.id} label={tt.name} value={`${tt.soldQuantity} / ${tt.quantity}`} hint={formatMoney(tt.price, tt.currency, locale)} />
        ))}
      </div>
      <BookingsTable title={t("eventBookings")} rows={rows} locale={locale} />
    </div>
  );
}

export async function OrganizerBookingsPage() {
  const user = await requireRole(["ORGANIZER", "ADMIN"]);
  const organizer = await getOrganizerForUser(user.id);
  if (!organizer) return <NeedsProfile />;
  const [t, locale, rows] = await Promise.all([getTranslations("organizer"), getLocale(), listOrganizerBookings(organizer.id, { limit: 100 })]);
  return (
    <div>
      <PageHeading title={t("bookingsTitle")} />
      <BookingsTable title={t("allBookings")} rows={rows} locale={locale} />
    </div>
  );
}

export async function OrganizerProfilePage() {
  const user = await requireUser();
  const [t, organizer] = await Promise.all([getTranslations("organizer.profile"), getOrganizerForUser(user.id)]);
  return (
    <div className="max-w-2xl">
      <PageHeading title={t("title")} description={t("subtitle")} />
      <Card className="p-5">
        <OrganizerProfileForm
          initial={organizer ? { name: organizer.name, description: organizer.description ?? "", website: organizer.website ?? "", image: organizer.image ?? "" } : undefined}
        />
      </Card>
    </div>
  );
}

export async function OnboardingPage() {
  const user = await requireUser();
  const [t, organizer] = await Promise.all([getTranslations("organizer.onboarding"), getOrganizerForUser(user.id)]);
  if (organizer) {
    return (
      <div className="text-center">
        <p aria-hidden="true" className="text-5xl">🏢</p>
        <h1 className="mt-3 text-2xl font-bold">{t("alreadyTitle")}</h1>
        <Link href="/organizer" className={buttonClass({ className: "mt-6 w-full" })}>{t("goToDashboard")}</Link>
      </div>
    );
  }
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-sm text-gray-500">{t("subtitle")}</p>
      </div>
      <OrganizerProfileForm redirectTo="/organizer" />
      <p className="mt-6 text-center text-sm"><Link href="/discover" className="text-brand-700 hover:underline">{t("skip")}</Link></p>
    </>
  );
}
