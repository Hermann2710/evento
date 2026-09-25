import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { AdminCategoriesPage } from "@/features/admin/pages/admin-pages";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "admin", "/admin/categories", { noindex: true });
}

export default async function Page() {
  return <AdminCategoriesPage />;
}
