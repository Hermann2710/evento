import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ProfilePage } from "@/features/profile/pages/profile-page";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "profile", "/profile", { noindex: true });
}

export default async function Page() {
  return <ProfilePage />;
}
