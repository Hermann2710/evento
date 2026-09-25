import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { FavoritesPage } from "@/features/favorites/pages/favorites-page";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "favorites", "/favorites", { noindex: true });
}

export default async function Page() {
  return <FavoritesPage />;
}
