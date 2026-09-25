import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { parseSearchParams } from "@/features/search/validations";
import { SearchPage } from "@/features/search/pages/search-page";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "search", "/search");
}

export default async function Page({ searchParams }: Props) {
  return <SearchPage params={parseSearchParams(await searchParams)} />;
}
