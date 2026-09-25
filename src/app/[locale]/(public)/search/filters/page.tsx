import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { parseSearchParams } from "@/features/search/validations";
import { SearchFiltersPage } from "@/features/search/pages/search-page";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "searchFilters", "/search/filters");
}

export default async function Page({ searchParams }: Props) {
  return <SearchFiltersPage params={parseSearchParams(await searchParams)} />;
}
