import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["admin", "organizer", "checkout", "profile", "tickets", "bookings", "favorites", "notifications", "welcome", "onboarding"];
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", ...privatePaths.map((p) => `/*/${p}`)],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
