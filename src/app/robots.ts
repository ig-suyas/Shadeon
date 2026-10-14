import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Token pages from emails, the cron route, and development tools.
      disallow: ["/waitlist/", "/api/", "/dev/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
