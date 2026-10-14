import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Token pages from emails, account pages, the cron and code routes,
      // the registry (its links carry tokens), and development tools.
      disallow: [
        "/waitlist/",
        "/api/",
        "/dev/",
        "/r/",
        "/account",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/auth/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
