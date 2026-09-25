import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { pageParam } from "@/lib/params";
import { BookingsPage } from "@/features/booking/pages/booking-pages";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "bookings", "/bookings", { noindex: true });
}

export default async function Page({ searchParams }: Props) {
  return <BookingsPage page={pageParam(await searchParams)} />;
}
