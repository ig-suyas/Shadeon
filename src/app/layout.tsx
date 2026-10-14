import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { InlineScript } from "@/components/layout/inline-script";
import { SiteAnalytics } from "@/components/layout/site-analytics";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE_URL } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

// next/font downloads these at build time and serves them from this origin.
const display = Geist({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const code = Geist_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  display: "swap",
  // Code and readouts sit below the fold; do not let this font compete with
  // the headline font for bandwidth during the first paint.
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Shadeon", template: "%s · Shadeon" },
  description:
    "A free library of original animated shaders with copy-ready React, JavaScript and GLSL code.",
  openGraph: { siteName: "Shadeon", type: "website", locale: "en" },
  twitter: { card: "summary_large_image" },
};

// Upper bound, in seconds, for any server work under this layout, including
// the form actions: a stuck request ends instead of running (and billing) on.
export const maxDuration = 15;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0f" },
    { media: "(prefers-color-scheme: light)", color: "#f3f4f6" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${code.variable} h-full antialiased`}
      // The inline script below may set data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="bg-solid text-solid-text rounded-control sr-only z-(--z-dialog) px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
        {/* Vercel serves the analytics script only on its own deployments
            (it sets VERCEL=1 there); elsewhere the tag would just 404. */}
        {process.env.VERCEL === "1" ? <SiteAnalytics /> : null}
      </body>
    </html>
  );
}
