import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { pageParam, spFirst } from "@/lib/params";
import { AdminReportsPage } from "@/features/admin/pages/admin-pages";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "admin", "/admin/reports", { noindex: true });
}

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  void spFirst;
  return <AdminReportsPage status={(["open", "resolved", "dismissed"] as const).find((s) => s === spFirst(sp.status)) ?? "open"} page={pageParam(sp)} />;
}
