import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { pageParam } from "@/lib/params";
import { DiscoverPage } from "@/features/events/pages/discover-page";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "discover", "/discover");
}

export default async function Page({ searchParams }: Props) {
  return <DiscoverPage page={pageParam(await searchParams)} />;
}
