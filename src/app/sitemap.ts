import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { shaders } from "@/shaders/registry";

/**
 * Every public page. Not listed: /dev/* (404 in production), /waitlist/*
 * (one-time token pages) and /api/*. Dates are left out for pages without a
 * real one: a build date would claim a change that did not happen.
 */
const PAGES: { path: string; priority: number }[] = [
  { path: "", priority: 1 },
  { path: "/shaders", priority: 0.9 },
  { path: "/docs", priority: 0.7 },
  { path: "/pricing", priority: 0.5 },
  { path: "/about", priority: 0.4 },
  { path: "/changelog", priority: 0.4 },
  { path: "/request", priority: 0.3 },
  { path: "/contact", priority: 0.3 },
  { path: "/legal/license", priority: 0.2 },
  { path: "/legal/terms", priority: 0.1 },
  { path: "/legal/privacy", priority: 0.1 },
  { path: "/legal/cookies", priority: 0.1 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...PAGES.map(({ path, priority }) => ({ url: `${SITE_URL}${path}`, priority })),
    ...shaders.map((shader) => ({
      url: `${SITE_URL}/shaders/${shader.id}`,
      lastModified: shader.addedAt,
      priority: 0.8,
    })),
  ];
}
