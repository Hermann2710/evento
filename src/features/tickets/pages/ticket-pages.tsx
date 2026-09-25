import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/guards";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card, statusTone } from "@/components/ui/display";
import { EmptyState } from "@/components/ui/states";
import { PageHeading } from "@/components/layout/dashboard-shell";
import { formatDateTime } from "@/lib/format";
import { currentTime } from "@/lib/utils";
import { getUserTicket, listUserTickets } from "../queries";
import { PrintButton } from "../components/print-button";

export async function TicketsPage() {
  const user = await requireUser();
  const [t, ts, locale, tickets] = await Promise.all([getTranslations("tickets"), getTranslations("status"), getLocale(), listUserTickets(user.id)]);
  const now = currentTime();
  const upcoming = tickets.filter((x) => x.endDate.getTime() >= now);
  const past = tickets.filter((x) => x.endDate.getTime() < now);

  const renderList = (list: typeof tickets) => (
    <ul className="grid gap-3 sm:grid-cols-2">
      {list.map((ticket) => (
        <li key={ticket.id}>
          <Link href={`/tickets/${ticket.id}`} className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-brand-300">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{ticket.eventTitle}</p>
              <Badge tone={statusTone(ticket.status)}>{ts(`ticket.${ticket.status}`)}</Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500">{formatDateTime(ticket.startDate, locale, ticket.timezone)}</p>
            <p className="mt-auto pt-3 text-xs font-mono text-gray-600">{ticket.ticketTypeName} · {ticket.ticketNumber}</p>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeading title={t("title")} description={t("subtitle")} />
      {tickets.length === 0 ? (
        <EmptyState icon="🎟️" title={t("emptyTitle")} description={t("emptyDescription")} action={<Link href="/discover" className={buttonClass()}>{t("explore")}</Link>} />
      ) : (
        <>
          <section aria-labelledby="upcoming-tickets">
            <h2 id="upcoming-tickets" className="mb-3 text-lg font-semibold">{t("upcoming")}</h2>
            {upcoming.length ? renderList(upcoming) : <p className="text-sm text-gray-500">{t("noUpcoming")}</p>}
          </section>
          {past.length > 0 && (
            <section aria-labelledby="past-tickets">
              <h2 id="past-tickets" className="mb-3 text-lg font-semibold">{t("past")}</h2>
              {renderList(past)}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export async function TicketDetailPage({ ticketId }: { ticketId: string }) {
  const user = await requireUser();
  const [ticket, t, ts, locale] = await Promise.all([getUserTicket(user.id, ticketId), getTranslations("tickets"), getTranslations("status"), getLocale()]);
  if (!ticket) notFound();

  return (
    <div className="mx-auto max-w-md">
      <Card className="overflow-hidden print:shadow-none">
        <div className="bg-gradient-to-r from-brand-700 to-brand-500 p-5 text-white">
          <p className="text-xs uppercase tracking-widest text-brand-100">Evento · {ticket.ticketTypeName}</p>
          <h1 className="mt-1 text-xl font-bold">{ticket.eventTitle}</h1>
          <p className="mt-1 text-sm text-brand-100">{formatDateTime(ticket.startDate, locale, ticket.timezone)} ({ticket.timezone})</p>
        </div>
        <div className="flex flex-col items-center gap-4 p-6">
          {ticket.status === "valid" && ticket.eventStatus !== "canceled" ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL generated server-side
            <img src={ticket.qrCode} alt={t("qrAlt", { number: ticket.ticketNumber })} width={260} height={260} className="rounded-xl border border-gray-200" />
          ) : (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">{t("invalidTicket")}</p>
          )}
          <p className="font-mono text-lg font-semibold tracking-wider">{ticket.ticketNumber}</p>
          <Badge tone={statusTone(ticket.status)}>{ts(`ticket.${ticket.status}`)}</Badge>
          <dl className="w-full space-y-2 border-t border-dashed border-gray-300 pt-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-gray-500">{t("location")}</dt><dd className="text-right">{ticket.location}, {ticket.city}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">{t("type")}</dt><dd>{ticket.ticketTypeName}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">{t("booking")}</dt><dd className="font-mono">{ticket.bookingId.slice(0, 8).toUpperCase()}</dd></div>
          </dl>
        </div>
      </Card>
      <div className="mt-4 flex gap-3 print:hidden">
        <PrintButton label={t("print")} />
        <Link href={`/events/${ticket.eventSlug}`} className={buttonClass({ variant: "outline" })}>{t("viewEvent")}</Link>
      </div>
    </div>
  );
}
