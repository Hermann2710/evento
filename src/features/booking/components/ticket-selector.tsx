"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/display";
import { useSocketEvent, useSocketRoom } from "@/hooks/use-socket";
import { formatMoney } from "@/lib/format";
import { computeTotals, MAX_TICKETS_PER_TYPE } from "@/lib/pricing";
import { SOCKET_EVENTS, type TicketAvailabilityPayload } from "@/lib/realtime/events";
import { useTicketSelection } from "@/stores/ticket-selection-store";
import { createBookingAction } from "../actions";

export type SelectableTicketType = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  remaining: number;
  salesOpen: boolean;
};

type Props = {
  eventId: string;
  ticketTypes: SelectableTicketType[];
  canBook: boolean;
  isAuthenticated: boolean;
  loginHref: string;
};

export function TicketSelector({ eventId, ticketTypes, canBook, isAuthenticated, loginHref }: Props) {
  const t = useTranslations("booking");
  const te = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [remaining, setRemaining] = useState<Record<string, number>>(() => Object.fromEntries(ticketTypes.map((tt) => [tt.id, tt.remaining])));
  const storeEventId = useTicketSelection((s) => s.eventId);
  const storeQuantities = useTicketSelection((s) => s.quantities);
  const setQuantity = useTicketSelection((s) => s.setQuantity);
  const reset = useTicketSelection((s) => s.reset);
  const quantities = storeEventId === eventId ? storeQuantities : {};

  // Live availability (PostgreSQL remains the source of truth, the server re-checks on booking).
  useSocketRoom(SOCKET_EVENTS.joinEvent, eventId, SOCKET_EVENTS.leaveEvent);
  useSocketEvent<TicketAvailabilityPayload>(SOCKET_EVENTS.ticketAvailability, (payload) => {
    if (payload.eventId !== eventId) return;
    setRemaining((prev) => ({ ...prev, ...Object.fromEntries(payload.ticketTypes.map((x) => [x.id, x.remaining])) }));
  });

  const currency = ticketTypes[0]?.currency ?? "XAF";
  const lines = ticketTypes.filter((tt) => quantities[tt.id]).map((tt) => ({ unitPrice: tt.price, quantity: quantities[tt.id] }));
  const totals = computeTotals(lines);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const money = (v: number) => formatMoney(v, currency, locale);

  const submit = () =>
    startTransition(async () => {
      const items = Object.entries(quantities).map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
      const res = await createBookingAction({ eventId, items });
      if (!res.ok) {
        toast.error(te(res.error));
        router.refresh();
        return;
      }
      reset();
      toast.success(res.data.free ? t("freeConfirmed") : t("reserved"));
      router.push(res.data.free ? `/bookings/${res.data.bookingId}` : `/checkout/${res.data.bookingId}`);
    });

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {ticketTypes.map((tt) => {
          const left = remaining[tt.id] ?? 0;
          const qty = quantities[tt.id] ?? 0;
          const max = Math.min(MAX_TICKETS_PER_TYPE, left);
          const disabled = !canBook || !tt.salesOpen || left <= 0;
          return (
            <li key={tt.id} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{tt.name}</p>
                  {tt.description && <p className="text-xs text-gray-500">{tt.description}</p>}
                  <p className="mt-1 text-sm font-medium text-brand-700">{tt.price === 0 ? t("free") : money(tt.price)}</p>
                  <p className="mt-0.5 text-xs text-gray-500" aria-live="polite">
                    {left <= 0 ? <Badge tone="red">{t("soldOut")}</Badge> : !tt.salesOpen ? <Badge>{t("salesClosed")}</Badge> : t("remaining", { count: left })}
                  </p>
                </div>
                <div className="flex items-center gap-1" role="group" aria-label={t("quantityFor", { name: tt.name })}>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={disabled || qty <= 0} onClick={() => setQuantity(eventId, tt.id, qty - 1)} aria-label={t("decrease", { name: tt.name })}>
                    −
                  </Button>
                  <span className="w-7 text-center font-semibold" aria-live="polite">{qty}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={disabled || qty >= max} onClick={() => setQuantity(eventId, tt.id, qty + 1)} aria-label={t("increase", { name: tt.name })}>
                    +
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {count > 0 && (
        <dl className="space-y-1 rounded-xl bg-gray-50 p-3 text-sm">
          <div className="flex justify-between"><dt>{t("subtotal")}</dt><dd>{money(totals.subtotal)}</dd></div>
          <div className="flex justify-between text-gray-500"><dt>{t("fees")}</dt><dd>{money(totals.fees)}</dd></div>
          <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold"><dt>{t("total")}</dt><dd>{money(totals.total)}</dd></div>
        </dl>
      )}

      {isAuthenticated ? (
        <Button className="w-full" size="lg" disabled={!canBook || count === 0} loading={pending} onClick={submit}>
          {count === 0 ? t("selectTickets") : t("bookCount", { count })}
        </Button>
      ) : (
        <Link href={loginHref} className={buttonClass({ size: "lg", className: "w-full" })}>
          {t("loginToBook")}
        </Link>
      )}
      <p className="text-center text-xs text-gray-500">{t("serverPricingNote")}</p>
    </div>
  );
}
