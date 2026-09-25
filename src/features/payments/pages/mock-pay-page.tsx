import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/db";
import { bookings, events, payments } from "@/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { Card } from "@/components/ui/display";
import { formatMoney } from "@/lib/format";
import { MockPayButtons } from "../components/mock-pay-buttons";

/** Hosted payment page of the sandbox provider. */
export async function MockPayPage({ bookingId, paymentId }: { bookingId: string; paymentId?: string }) {
  const user = await requireUser();
  if (!paymentId || !/^[0-9a-f-]{36}$/i.test(paymentId)) notFound();
  const [row] = await db
    .select({ amount: payments.amount, currency: payments.currency, status: payments.status, eventTitle: events.title })
    .from(payments)
    .innerJoin(bookings, eq(bookings.id, payments.bookingId))
    .innerJoin(events, eq(events.id, bookings.eventId))
    .where(and(eq(payments.id, paymentId), eq(payments.bookingId, bookingId), eq(bookings.userId, user.id), eq(payments.provider, "mock")))
    .limit(1);
  if (!row) notFound();
  const [t, locale] = await Promise.all([getTranslations("payments"), getLocale()]);

  return (
    <div className="mx-auto max-w-md">
      <Card className="overflow-hidden">
        <div className="bg-gray-900 px-6 py-4 text-white">
          <p className="text-sm font-semibold tracking-wide">{t("sandboxTitle")}</p>
          <p className="text-xs text-gray-300">{t("sandboxSubtitle")}</p>
        </div>
        <div className="space-y-5 p-6">
          <div>
            <p className="text-sm text-gray-500">{row.eventTitle}</p>
            <p className="text-3xl font-bold">{formatMoney(row.amount, row.currency, locale)}</p>
          </div>
          {row.status === "pending" || row.status === "processing" ? (
            <MockPayButtons paymentId={paymentId} bookingId={bookingId} />
          ) : (
            <p role="status" className="rounded-xl bg-gray-100 p-3 text-sm">{t("alreadyProcessed")}</p>
          )}
          <p className="text-xs text-gray-500">{t("sandboxNote")}</p>
        </div>
      </Card>
    </div>
  );
}
