import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { RegisterPage } from "@/features/auth/pages/auth-pages";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "register", "/register");
}

export default async function Page() {
  return <RegisterPage />;
}
