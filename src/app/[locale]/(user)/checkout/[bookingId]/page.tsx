import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { assertUuid } from "@/lib/params";
import { CheckoutPage } from "@/features/booking/pages/booking-pages";

type Props = { params: Promise<{ locale: string; bookingId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "checkout", "/checkout", { noindex: true });
}

export default async function Page({ params }: Props) {
  const p = await params;
  const id = assertUuid(p.bookingId);
  return <CheckoutPage bookingId={id} />;
}
