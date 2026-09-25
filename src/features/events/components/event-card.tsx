import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/display";
import { SmartImage } from "@/components/ui/smart-image";
import { formatDate, formatMoney, formatShortDate, formatTime } from "@/lib/format";
import type { EventListItem } from "../queries/list-events";

export function EventCard({ event, priority = false }: { event: EventListItem; priority?: boolean }) {
  const t = useTranslations("events");
  const locale = useLocale();
  const { day, month } = formatShortDate(event.startDate, locale, event.timezone);
  const soldOut = event.remaining <= 0 && event.minPrice !== null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[16/10] bg-gradient-to-br from-brand-200 to-sky-200">
        {event.coverImage && (
          <SmartImage
            src={event.coverImage}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
        )}
        <div className="absolute left-3 top-3 rounded-xl bg-white/95 px-2.5 py-1.5 text-center shadow">
          <p className="text-lg font-bold leading-none text-gray-900">{day}</p>
          <p className="text-[11px] font-semibold uppercase text-brand-700">{month}</p>
        </div>
        {soldOut && (
          <Badge tone="red" className="absolute right-3 top-3">
            {t("soldOut")}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {event.categoryName && <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{event.categoryName}</p>}
        <h3 className="mt-1 line-clamp-2 font-semibold text-gray-900">
          <Link href={`/events/${event.slug}`} className="after:absolute after:inset-0 focus:outline-none">
            {event.title}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          <time dateTime={event.startDate.toISOString()}>
            {formatDate(event.startDate, locale, event.timezone)} · {formatTime(event.startDate, locale, event.timezone)}
          </time>
        </p>
        <p className="mt-0.5 truncate text-sm text-gray-500">📍 {event.city}, {event.country}</p>
        <p className="mt-auto pt-3 text-sm font-semibold text-gray-900">
          {event.minPrice === null
            ? t("noTickets")
            : event.minPrice === 0
              ? t("free")
              : t("fromPrice", { price: formatMoney(event.minPrice, event.currency ?? "XAF", locale) })}
        </p>
      </div>
    </article>
  );
}

export function EventGrid({ events, priorityCount = 0 }: { events: EventListItem[]; priorityCount?: number }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {events.map((event, i) => (
        <li key={event.id}>
          <EventCard event={event} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function EventGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="aspect-[16/10] animate-pulse bg-gray-200" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
          </div>
        </li>
      ))}
    </ul>
  );
}
