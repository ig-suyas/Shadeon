"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/** Paths whose address may carry a personal, one-time token. They are never reported. */
const PRIVATE_PATHS = ["/waitlist"];

/**
 * Removes anything that should not leave the browser before a page view is
 * reported: token pages are dropped entirely, and query strings are stripped
 * everywhere (they hold shader settings and search text, which analytics does
 * not need).
 */
export function scrubAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url);
    if (PRIVATE_PATHS.some((path) => url.pathname.startsWith(path))) return null;
    url.search = "";
    url.hash = "";
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}

/**
 * Vercel Web Analytics: page views only, no third-party cookies, no custom
 * events. It only sends data on a Vercel deployment with Web Analytics
 * enabled; elsewhere it does nothing.
 */
export function SiteAnalytics() {
  return <Analytics beforeSend={scrubAnalyticsEvent} />;
}
