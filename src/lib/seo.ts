import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

/** Localized metadata with canonical URL, hreflang alternates, Open Graph and Twitter cards. */
export async function pageMetadata(locale: string, key: string, path: string, opts: { noindex?: boolean } = {}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t(`${key}.title`);
  const description = t(`${key}.description`);
  const suffix = path === "/" ? "" : path;
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${suffix}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}${suffix}`])),
    },
    openGraph: { title, description, url: `/${locale}${suffix}`, type: "website", siteName: "Evento" },
    twitter: { card: "summary_large_image", title, description },
    robots: opts.noindex ? { index: false, follow: false } : undefined,
  };
}
