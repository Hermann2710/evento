import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { pageParam, spFirst } from "@/lib/params";
import { NotificationsPage } from "@/features/notifications/pages/notifications-page";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "notifications", "/notifications", { noindex: true });
}

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  return <NotificationsPage filter={spFirst(sp.filter) === "unread" ? "unread" : "all"} page={pageParam(sp)} />;
}
