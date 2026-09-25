import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { pageParam, spFirst } from "@/lib/params";
import { AdminOrganizersPage } from "@/features/admin/pages/admin-pages";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "admin", "/admin/organizers", { noindex: true });
}

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  void spFirst;
  return <AdminOrganizersPage page={pageParam(sp)} />;
}
