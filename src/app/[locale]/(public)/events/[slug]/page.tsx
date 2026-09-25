import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageParam } from "@/lib/params";
import { getEventBySlug } from "@/features/events/queries/event-detail";
import { EventDetailPage } from "@/features/events/pages/event-detail-page";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const event = await getEventBySlug(slug);
  const t = await getTranslations({ locale, namespace: "meta" });
  if (!event || event.status === "draft" || event.status === "hidden") return { title: t("notFound.title"), robots: { index: false } };
  const description = event.description.slice(0, 160);
  const images = event.coverImage ? [{ url: event.coverImage, alt: event.title }] : undefined;
  return {
    title: event.title,
    description,
    alternates: {
      canonical: `/${locale}/events/${slug}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/events/${slug}`])),
    },
    openGraph: { type: "article", title: event.title, description, url: `/${locale}/events/${slug}`, images },
    twitter: { card: "summary_large_image", title: event.title, description, images: event.coverImage ? [event.coverImage] : undefined },
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  return <EventDetailPage slug={slug} commentPage={pageParam(await searchParams, "cpage")} />;
}
