import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Cookie notice",
  description:
    "Shadeon sets only the cookies needed to keep you signed in. This page lists everything stored in your browser.",
  alternates: { canonical: "/legal/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie notice"
      lead="Shadeon sets cookies only to keep you signed in, and only when you sign in. There are no tracking or advertising cookies, so there is no cookie banner. This page lists everything that is stored in your browser, and why."
    >
      <h2>Cookies</h2>
      <p>
        We set only these cookies, both strictly necessary for signing in. Neither is set if you
        only browse. Both are HttpOnly (scripts on the page cannot read them), sent only to this
        site, and never used for tracking.
      </p>
      <ul>
        <li>
          <strong>Session</strong> (<code>__Host-shadeon_session</code>): keeps you signed in. Set
          when you sign in; holds a random key, not your details. Removed when you sign out, and
          expires after at most 30 days.
        </li>
        <li>
          <strong>Google sign-in check</strong> (<code>__Host-shadeon_oauth</code>): set only while
          you sign in with Google, to make sure the answer from Google belongs to the sign-in you
          started. Deleted as soon as it is used, and expires after 10 minutes.
        </li>
      </ul>
      <p>
        We do not use advertising or cross-site tracking cookies, and we do not embed social media
        widgets. If you choose to sign in with Google, you do that on Google&apos;s own pages, where
        Google&apos;s cookie policy applies.
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
        If we ever add a cookie or anything else that needs your consent, we will ask for it first
        and update this page.
      </p>
    </LegalPage>
  );
}
