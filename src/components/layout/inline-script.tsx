"use client";

/**
 * A script that runs while the browser parses the server HTML, before first
 * paint. On the client it renders as inert text/plain, so React does not warn
 * about (or try to re-run) it. Pattern from the Next.js guide "Preventing
 * flash before hydration".
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
