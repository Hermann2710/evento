import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/guards";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card, statusTone } from "@/components/ui/display";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { PageHeading } from "@/components/layout/dashboard-shell";
import { formatDate, formatMoney } from "@/lib/format";
import { totalPages } from "@/lib/utils";
import { getUserBooking, listUserBookings } from "../queries";
import { releaseExpiredBookings } from "../services/booking-service";
import { BookingSummary } from "../components/booking-summary";
import { BookingStatusWatcher, CancelBookingButton, Countdown, PayButton } from "../components/checkout-controls";

export async function CheckoutPage({ bookingId }: { bookingId: string }) {
  const user = await requireUser();
  await releaseExpiredBookings();
  const [booking, t, locale] = await Promise.all([getUserBooking(user.id, bookingId), getTranslations("booking"), getLocale()]);
  if (!booking) notFound();
  if (booking.status === "confirmed") return redirect({ href: `/bookings/${booking.id}`, locale });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeading title={t("checkoutTitle")} description={t("checkoutSubtitle")} />
      <BookingSummary booking={booking} />
      {booking.status === "pending" ? (
        <Card className="space-y-3 p-5">
          {booking.expiresAt && <Countdown expiresAt={booking.expiresAt.toISOString()} />}
          <PayButton bookingId={booking.id} label={t("payNow", { amount: formatMoney(booking.total, booking.currency, locale) })} />
          <CancelBookingButton bookingId={booking.id} />
          <p className="text-center text-xs text-gray-500">{t("securePayment")}</p>
        </Card>
      ) : (
        <EmptyState
          icon="⌛"
          title={t("notPayableTitle")}
          description={t("notPayableDescription")}
          action={<Link href={`/events/${booking.event.slug}`} className={buttonClass()}>{t("backToEvent")}</Link>}
        />
      )}
    </div>
  );
}

export async function BookingDetailPage({ bookingId }: { bookingId: string }) {
  const user = await requireUser();
  const [booking, t, ts] = await Promise.all([getUserBooking(user.id, bookingId), getTranslations("booking"), getTranslations("status")]);
  if (!booking) notFound();
  const lastPayment = booking.payments[0];
  const waiting = booking.status === "pending" && (lastPayment?.status === "pending" || lastPayment?.status === "processing");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <BookingStatusWatcher bookingId={booking.id} active={booking.status === "pending"} />
      <PageHeading title={t("bookingTitle")} description={t("reference", { id: booking.id.slice(0, 8).toUpperCase() })} />
      {booking.status === "confirmed" && (
        <div role="status" className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">
          <p className="font-semibold">{t("confirmedTitle")}</p>
          <p className="text-sm">{t("confirmedDescription", { count: booking.tickets.length })}</p>
        </div>
      )}
      {waiting && (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">{t("awaitingPayment")}</div>
      )}
      {(booking.status === "failed" || booking.status === "expired") && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">{t(`statusMessage.${booking.status}`)}</div>
      )}
      <BookingSummary booking={booking} />
      {lastPayment && (
        <Card className="flex items-center justify-between p-5 text-sm">
          <span>{t("payment")}</span>
          <Badge tone={statusTone(lastPayment.status)}>{ts(`payment.${lastPayment.status}`)}</Badge>
        </Card>
      )}
      <div className="flex flex-wrap gap-3">
        {booking.status === "confirmed" && <Link href="/tickets" className={buttonClass()}>{t("viewTickets")}</Link>}
        {booking.status === "pending" && <Link href={`/checkout/${booking.id}`} className={buttonClass()}>{t("continuePayment")}</Link>}
        <Link href={`/events/${booking.event.slug}`} className={buttonClass({ variant: "outline" })}>{t("backToEvent")}</Link>
      </div>
    </div>
  );
}

export async function BookingsPage({ page }: { page: number }) {
  const user = await requireUser();
  const [t, ts, locale, { items, total }] = await Promise.all([
    getTranslations("booking"),
    getTranslations("status"),
    getLocale(),
    listUserBookings(user.id, page),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading title={t("myBookings")} />
      {items.length === 0 ? (
        <EmptyState icon="🧾" title={t("emptyTitle")} description={t("emptyDescription")} action={<Link href="/discover" className={buttonClass()}>{t("explore")}</Link>} />
      ) : (
        <ul className="space-y-3">
          {items.map((b) => (
            <li key={b.id}>
              <Link href={`/bookings/${b.id}`} className="block rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-brand-300">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{b.eventTitle}</p>
                    <p className="text-sm text-gray-500">{formatDate(b.startDate, locale, b.timezone)} · {formatMoney(b.total, b.currency, locale)}</p>
                  </div>
                  <Badge tone={statusTone(b.status)}>{ts(`booking.${b.status}`)}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} totalPages={totalPages(total, 10)} pathname="/bookings" />
    </div>
  );
}
