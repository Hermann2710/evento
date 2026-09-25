import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { HomePage } from "@/features/events/pages/home-page";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "home", "/");
}

export default async function Page() {
  return <HomePage />;
}
