import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { NewEventPage } from "@/features/organizer/pages/organizer-pages";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "newEvent", "/organizer/events/new", { noindex: true });
}

export default async function Page() {
  return <NewEventPage />;
}
