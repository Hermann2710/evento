import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/guards";
import { siteUrl } from "@/lib/site";
import { AppProviders } from "@/providers/app-providers";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("siteTitle"), template: `%s · Evento` },
    description: t("siteDescription"),
    applicationName: "Evento",
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      type: "website",
      siteName: "Evento",
      title: t("siteTitle"),
      description: t("siteDescription"),
      locale: locale === "fr" ? "fr_FR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t("siteTitle"),
      description: t("siteDescription"),
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [user, t] = await Promise.all([
    getCurrentUser(),
    getTranslations("common"),
  ]);

  return (
    <NextIntlClientProvider>
      <html lang={locale}>
        <body className="min-h-screen">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
          >
            {t("skipToContent")}
          </a>
          <AppProviders userId={user?.id ?? null}>{children}</AppProviders>
        </body>
      </html>
    </NextIntlClientProvider>
  );
}
