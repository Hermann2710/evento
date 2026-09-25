import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ForgotPasswordPage } from "@/features/auth/pages/auth-pages";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "forgotPassword", "/forgot-password", { noindex: true });
}

export default async function Page() {
  return <ForgotPasswordPage />;
}
