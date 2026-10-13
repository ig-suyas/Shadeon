import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Cookie notice",
  description:
    "Shadeon sets no cookies of its own. This page lists what is stored in your browser.",
  alternates: { canonical: "/legal/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie notice"
      lead="Shadeon sets no cookies of its own, so there is no cookie banner. This page lists the little that is stored in your browser, and why."
    >
      <h2>Cookies</h2>
      <p>
        We do not set cookies. We do not use advertising or cross-site tracking cookies, and we do
        not embed social media widgets.
      </p>

      <h2>Stored on your device</h2>
      <ul>
        <li>
          <strong>Theme</strong> (local storage, key <code>shadeon:theme</code>): remembers whether
          you chose the light or dark theme. It is saved only if you press the theme button, it
          stays on your device, and it is never sent to us.
        </li>
      </ul>
      <p>You can remove it at any time by clearing this site&apos;s data in your browser.</p>

      <h2>Page statistics</h2>
      <p>
        We count page views with Vercel Web Analytics. According to Vercel&apos;s documentation it
        uses no third-party cookies and recognises a visitor by a short-lived hash of the request,
        discarded after 24 hours. Details are in the{" "}
        <Link href="/legal/privacy">privacy policy</Link>.
      </p>

      <h2>The human check on forms</h2>
      <p>
        Forms may be protected by Cloudflare Turnstile. When it is active, Cloudflare&apos;s script
        runs on the page with the form and may store data in your browser that it needs to perform
        the check. It is loaded only on pages that have a form.
      </p>

      <h2>If this changes</h2>
      <p>
        If we ever add something that needs your consent, we will ask for it first and update this
        page.
      </p>
    </LegalPage>
  );
}
