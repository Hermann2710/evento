import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { OrganizerProfilePage } from "@/features/organizer/pages/organizer-pages";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "organizerProfile", "/organizer/profile", { noindex: true });
}

export default async function Page() {
  return <OrganizerProfilePage />;
}
