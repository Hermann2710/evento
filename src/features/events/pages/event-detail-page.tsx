import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { Avatar, Badge, Card } from "@/components/ui/display";
import { ImagePreview, SmartImage } from "@/components/ui/smart-image";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTime, formatTime } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import { currentTime, totalPages } from "@/lib/utils";
import { TicketSelector } from "@/features/booking/components/ticket-selector";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";
import { isFavorite } from "@/features/favorites/queries";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { getUserReview, listReviews } from "@/features/reviews/queries";
import { reviewEligibility } from "@/features/reviews/services";
import { ReportButton } from "@/features/reports/components/report-button";
import { CommentForm, CommentItem } from "@/features/comments/components/comment-components";
import { COMMENTS_PAGE_SIZE, listComments } from "@/features/comments/queries";
import { getAvailability, getEventBySlug } from "../queries/event-detail";

export async function EventDetailPage({ slug, commentPage }: { slug: string; commentPage: number }) {
  const [event, user] = await Promise.all([getEventBySlug(slug), getCurrentUser()]);
  if (!event) notFound();
  const isOwner = Boolean(user && event.organizer.userId === user.id);
  const isAdmin = user?.role === "ADMIN";
  if ((event.status === "draft" || event.status === "hidden") && !isOwner && !isAdmin) notFound();

  const availability = getAvailability(event);
  const [t, locale, favorite, reviews, userReview, eligibility, comments] = await Promise.all([
    getTranslations("events"),
    getLocale(),
    user ? isFavorite(user.id, event.id) : Promise.resolve(false),
    listReviews(event.id),
    user ? getUserReview(user.id, event.id) : Promise.resolve(null),
    user ? reviewEligibility(user.id, event.id) : Promise.resolve({ allowed: false }),
    listComments(event.id, commentPage),
  ]);

  const now = currentTime();
  const ticketTypes = event.ticketTypes.map((tt) => ({
    id: tt.id,
    name: tt.name,
    description: tt.description,
    price: tt.price,
    currency: tt.currency,
    remaining: Math.max(0, tt.quantity - tt.soldQuantity),
    salesOpen: (!tt.salesStart || tt.salesStart.getTime() <= now) && (!tt.salesEnd || tt.salesEnd.getTime() >= now),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description.slice(0, 300),
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    eventStatus: event.status === "canceled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    image: event.coverImage ? [event.coverImage] : undefined,
    location: { "@type": "Place", name: event.location, address: `${event.city}, ${event.country}` },
    organizer: { "@type": "Organization", name: event.organizer.name },
    offers: ticketTypes.map((tt) => ({
      "@type": "Offer",
      name: tt.name,
      price: tt.price / 100,
      priceCurrency: tt.currency,
      availability: tt.remaining > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url: absoluteUrl(`/${locale}/events/${event.slug}`),
    })),
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="relative h-64 bg-gradient-to-br from-brand-300 to-sky-300 sm:h-96">
        {event.coverImage && <SmartImage src={event.coverImage} alt="" fill priority sizes="100vw" className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10" />
        <div className="container-page absolute inset-x-0 bottom-0 pb-6 text-white">
          <div className="mb-2 flex flex-wrap gap-2">
            {event.category && <Badge tone="brand">{event.category.name}</Badge>}
            {availability === "canceled" && <Badge tone="red">{t("canceled")}</Badge>}
            {availability === "sold_out" && <Badge tone="red">{t("soldOut")}</Badge>}
            {availability === "past" && <Badge>{t("past")}</Badge>}
            {availability === "unpublished" && <Badge tone="yellow">{t(`statusLabel.${event.status}`)}</Badge>}
          </div>
          <h1 className="max-w-4xl text-3xl font-extrabold tracking-tight sm:text-5xl">{event.title}</h1>
        </div>
      </div>

      <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-8">
          {availability === "canceled" && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">{t("canceledNotice")}</div>}
          {availability === "past" && <div role="status" className="rounded-2xl border border-gray-200 bg-gray-100 p-4 text-gray-700">{t("pastNotice")}</div>}

          <dl className="grid gap-4 sm:grid-cols-2">
            <Card className="p-4">
              <dt className="text-xs font-semibold uppercase text-gray-500">{t("when")}</dt>
              <dd className="mt-1 font-medium">
                <time dateTime={event.startDate.toISOString()}>{formatDateTime(event.startDate, locale, event.timezone)}</time>
                <span className="block text-sm text-gray-500">{t("until", { time: formatTime(event.endDate, locale, event.timezone) })} · {event.timezone}</span>
              </dd>
            </Card>
            <Card className="p-4">
              <dt className="text-xs font-semibold uppercase text-gray-500">{t("where")}</dt>
              <dd className="mt-1 font-medium">{event.location}<span className="block text-sm text-gray-500">{event.city}, {event.country}</span></dd>
            </Card>
          </dl>

          <section aria-labelledby="about">
            <h2 id="about" className="mb-3 text-xl font-bold">{t("about")}</h2>
            <p className="whitespace-pre-line leading-relaxed text-gray-700">{event.description}</p>
          </section>

          {event.images.length > 0 && (
            <section aria-labelledby="gallery">
              <h2 id="gallery" className="mb-3 text-xl font-bold">{t("gallery")}</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {event.images.map((img, i) => (
                  <li key={img.id}><ImagePreview src={img.url} alt={t("galleryImage", { index: i + 1 })} className="aspect-square" /></li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="organizer" className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4">
            <Avatar src={event.organizer.image} firstName={event.organizer.name} alt={event.organizer.name} size={52} />
            <div className="min-w-0 flex-1">
              <h2 id="organizer" className="text-xs font-semibold uppercase text-gray-500">{t("organizedBy")}</h2>
              <p className="font-semibold">{event.organizer.name}</p>
              {event.organizer.description && <p className="line-clamp-2 text-sm text-gray-500">{event.organizer.description}</p>}
            </div>
            {user && !isOwner && <ReportButton targetType="event" targetId={event.id} compact />}
          </section>

          <section aria-labelledby="reviews" className="space-y-4">
            <h2 id="reviews" className="text-xl font-bold">
              {t("reviews")}{" "}
              {event.rating.average !== null && <span className="text-base font-medium text-gray-500">★ {event.rating.average.toFixed(1)} ({event.rating.total})</span>}
            </h2>
            {user && (eligibility.allowed || userReview) ? (
              <ReviewForm eventId={event.id} initial={userReview} />
            ) : (
              <p className="text-sm text-gray-500">{user ? t("reviewAttendeesOnly") : t("loginToReview")}</p>
            )}
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noReviews")}</p>
            ) : (
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{r.firstName} {r.lastName}</p>
                      <p className="text-amber-500" aria-label={t("ratingLabel", { rating: r.rating })}>{"★".repeat(r.rating)}<span className="text-gray-300">{"★".repeat(5 - r.rating)}</span></p>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{r.content}</p>
                    {user && user.id !== r.userId && <div className="mt-2"><ReportButton targetType="review" targetId={r.id} compact /></div>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="comments" className="space-y-4">
            <h2 id="comments" className="text-xl font-bold">{t("comments", { count: comments.total })}</h2>
            {user ? <CommentForm eventId={event.id} /> : <p className="text-sm text-gray-500"><Link href="/login" className="text-brand-700 underline">{t("loginToComment")}</Link></p>}
            {comments.items.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noComments")}</p>
            ) : (
              <ul className="space-y-4">
                {comments.items.map((c) => (
                  <li key={c.id}><CommentItem comment={c} currentUserId={user?.id ?? null} isAdmin={isAdmin} /></li>
                ))}
              </ul>
            )}
            <Pagination page={commentPage} totalPages={totalPages(comments.total, COMMENTS_PAGE_SIZE)} pathname={`/events/${event.slug}`} param="cpage" />
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">{t("tickets")}</h2>
            {ticketTypes.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noTickets")}</p>
            ) : (
              <TicketSelector
                eventId={event.id}
                ticketTypes={ticketTypes}
                canBook={availability === "available"}
                isAuthenticated={Boolean(user)}
                loginHref={`/login?callbackUrl=${encodeURIComponent(`/events/${event.slug}`)}`}
              />
            )}
          </Card>
          <div className="flex flex-wrap gap-2">
            <FavoriteButton eventId={event.id} initial={favorite} isAuthenticated={Boolean(user)} />
            {(isOwner || isAdmin) && <Link href={`/organizer/events/${event.id}/edit`} className="inline-flex h-10 items-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium">{t("edit")}</Link>}
          </div>
        </aside>
      </div>
    </article>
  );
}
