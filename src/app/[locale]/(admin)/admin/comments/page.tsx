import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { pageParam, spFirst } from "@/lib/params";
import { AdminCommentsPage } from "@/features/admin/pages/admin-pages";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "admin", "/admin/comments", { noindex: true });
}

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  void spFirst;
  return <AdminCommentsPage page={pageParam(sp)} />;
}
