import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { spFirst } from "@/lib/params";
import { LoginPage } from "@/features/auth/pages/auth-pages";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "login", "/login");
}

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  return <LoginPage callbackUrl={spFirst(sp.callbackUrl)} />;
}
