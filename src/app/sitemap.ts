import type { MetadataRoute } from "next";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticPaths = ["", "/discover", "/search"];
  const entries: MetadataRoute.Sitemap = staticPaths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      changeFrequency: "daily" as const,
      priority: path === "" ? 1 : 0.8,
      alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}${path}`])) },
    })),
  );
  try {
    const rows = await db
      .select({ slug: events.slug, updatedAt: events.updatedAt })
      .from(events)
      .where(and(eq(events.status, "published"), gte(events.endDate, new Date())))
      .limit(5000);
    for (const row of rows) {
      for (const locale of routing.locales) {
        entries.push({
          url: `${base}/${locale}/events/${row.slug}`,
          lastModified: row.updatedAt,
          changeFrequency: "weekly",
          priority: 0.7,
          alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}/events/${row.slug}`])) },
        });
      }
    }
  } catch (error) {
    console.error("[sitemap] failed to load events", error);
  }
  return entries;
}
