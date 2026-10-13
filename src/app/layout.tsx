import type { Metadata, Viewport } from "next";
import { Geist_Mono, Instrument_Sans } from "next/font/google";
import { InlineScript } from "@/components/layout/inline-script";
import { SiteAnalytics } from "@/components/layout/site-analytics";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE_URL } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

// next/font downloads these at build time and serves them from this origin.
const display = Instrument_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const code = Geist_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Shadeon", template: "%s · Shadeon" },
  description:
    "A free library of original animated shaders with copy-ready React, JavaScript and GLSL code.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0d" },
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
        <SiteAnalytics />
      </body>
    </html>
  );
}
