import { useLocale, useTranslations } from "next-intl";
import { Badge, Card, statusTone } from "@/components/ui/display";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { UserBooking } from "../queries";

export function BookingSummary({ booking }: { booking: UserBooking }) {
  const t = useTranslations("booking");
  const ts = useTranslations("status");
  const locale = useLocale();
  const money = (v: number) => formatMoney(v, booking.currency, locale);
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{booking.event.title}</h2>
          <p className="text-sm text-gray-500">{formatDateTime(booking.event.startDate, locale, booking.event.timezone)}</p>
          <p className="text-sm text-gray-500">📍 {booking.event.location}, {booking.event.city}</p>
        </div>
        <Badge tone={statusTone(booking.status)}>{ts(`booking.${booking.status}`)}</Badge>
      </div>
      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">{t("items")}</caption>
        <thead className="text-left text-xs uppercase text-gray-500">
          <tr><th className="py-1 font-medium">{t("ticket")}</th><th className="py-1 font-medium">{t("quantity")}</th><th className="py-1 text-right font-medium">{t("total")}</th></tr>
        </thead>
        <tbody>
          {booking.items.map((item) => (
            <tr key={item.id} className="border-t border-gray-100">
              <td className="py-2">{item.ticketType.name}</td>
              <td className="py-2">{item.quantity} × {money(item.unitPrice)}</td>
              <td className="py-2 text-right">{money(item.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-3 space-y-1 border-t border-gray-200 pt-3 text-sm">
        <div className="flex justify-between"><dt>{t("subtotal")}</dt><dd>{money(booking.subtotal)}</dd></div>
        <div className="flex justify-between text-gray-500"><dt>{t("fees")}</dt><dd>{money(booking.fees)}</dd></div>
        <div className="flex justify-between text-base font-bold"><dt>{t("total")}</dt><dd>{money(booking.total)}</dd></div>
      </dl>
    </Card>
  );
}
