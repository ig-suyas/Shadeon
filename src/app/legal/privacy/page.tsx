import type { Metadata } from "next";
import Link from "next/link";
import { ContactAddress, LegalPage } from "@/components/layout/legal-page";
import { LEGAL, RETENTION } from "@/content/legal";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What personal data Shadeon collects, why, how long it is kept, who processes it, and how to have it removed.",
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      lead="Shadeon is built to need very little about you. There are no accounts, no advertising and no tracking cookies. This page lists everything that is collected."
    >
      <h2>Who is responsible</h2>
      <p>
        Shadeon is operated by <strong>{LEGAL.operator}</strong> ({LEGAL.postalAddress}). For any
        question or request about your data, write to <ContactAddress />.
      </p>

      <h2>What we collect, and why</h2>

      <h3>If you only browse the site</h3>
      <ul>
        <li>
          <strong>Anonymous page statistics.</strong> We use Vercel Web Analytics to count page
          views. According to Vercel&apos;s documentation it uses no third-party cookies; a visitor
          is recognised by a hash created from the incoming request, and that is discarded after 24
          hours. With each page view it may record the time, the page address, the referring site,
          an approximate location (country, region, city), the browser, the operating system and the
          device type. We send it the page path only: query strings are removed first, and the
          waitlist confirmation and removal pages are not reported at all. We use these numbers to
          see which pages are used.
        </li>
        <li>
          <strong>Server logs.</strong> Our hosting provider processes your IP address and browser
          details in order to deliver the site and keep it secure, as every web server does.
        </li>
        <li>
          <strong>Preferences on your device.</strong> Your theme choice is saved in your
          browser&apos;s local storage. It never leaves your device. See the{" "}
          <Link href="/legal/cookies">cookie notice</Link>.
        </li>
      </ul>

      <h3>If you join the Pro waitlist</h3>
      <ul>
        <li>
          <strong>Your email address</strong>, the date you asked to join, and a record of the
          consent wording you agreed to.
        </li>
        <li>
          We use it for one purpose: to send you a confirmation email, and later a single
          announcement when Shadeon Pro is available. We rely on your consent, which you give by
          ticking the box and confirming by email.
        </li>
      </ul>

      <h3>If you request a shader or send a message</h3>
      <ul>
        <li>
          <strong>What you write</strong>, and your email address if you choose to give one.
        </li>
        <li>
          We use it to read and act on your request or message, and to reply if you asked for a
          reply.
        </li>
      </ul>

      <h3>To protect the forms from abuse</h3>
      <ul>
        <li>
          When you submit a form, we count submissions per network address and, for the waitlist,
          per email address, for a short time. The counters are keyed by a scrambled (hashed)
          version of the address, not the address itself, and expire within an hour.
        </li>
        <li>
          Forms may include a check by Cloudflare Turnstile to tell people from automated
          submissions. When it is active, Cloudflare receives technical details about your browser
          and connection to perform that check.
        </li>
      </ul>

      <h2>What we do not collect</h2>
      <ul>
        <li>We do not store IP addresses in our database.</li>
        <li>We do not use advertising or cross-site tracking.</li>
        <li>We do not sell personal data or share it for marketing.</li>
        <li>We do not ask for your name, and there are no user accounts.</li>
      </ul>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          <strong>Waitlist, not confirmed:</strong> deleted {RETENTION.unconfirmedWaitlistDays} days
          after the last confirmation email.
        </li>
        <li>
          <strong>Waitlist, confirmed:</strong> until you remove yourself, or until the Pro
          announcement has been sent, after which the list is deleted.
        </li>
        <li>
          <strong>Shader requests and messages:</strong> deleted after {RETENTION.messagesMonths}{" "}
          months.
        </li>
        <li>
          <strong>Abuse counters:</strong> up to one hour.
        </li>
      </ul>

      <h2>Who processes data for us</h2>
      <p>
        We use the following service providers. They process data on our instructions and only as
        needed to provide their service.
      </p>
      <ul>
        <li>
          <strong>Vercel</strong>: website hosting and page statistics.
        </li>
        <li>
          <strong>Neon</strong>: the database that holds waitlist addresses, requests and messages.
        </li>
        <li>
          <strong>Resend</strong>: sending the waitlist confirmation and announcement emails.
        </li>
        <li>
          <strong>Upstash</strong>: the short-lived abuse counters.
        </li>
        <li>
          <strong>Cloudflare</strong>: the Turnstile check on forms, when active.
        </li>
      </ul>
      <p>
        These providers may process data in countries other than your own, including the United
        States.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>
          <strong>Leave the waitlist</strong> at any time with the link in any email we send you.
          Your address is deleted, not just switched off.
        </li>
        <li>
          <strong>Ask what we hold about you</strong>, ask us to correct it, or ask us to delete it,
          by writing to <ContactAddress />. Tell us the email address you used so we can find it.
        </li>
        <li>
          <strong>Withdraw your consent</strong> at any time. It does not affect what was done
          before you withdrew it.
        </li>
        <li>
          <strong>Complain.</strong> If you are unhappy with how we handled your data, please write
          to us first. You also have the right to complain to the data protection authority where
          you live.
        </li>
      </ul>
      <p>We aim to answer every request within 30 days.</p>

      <h2>Children</h2>
      <p>
        The forms on this site are meant for people aged {LEGAL.minimumAge} or over. We do not
        knowingly collect data from children. If you believe a child has given us their data, write
        to us and we will delete it.
      </p>

      <h2>Security</h2>
      <p>
        The site is served over an encrypted connection. Confirmation and removal links are stored
        only in scrambled (hashed) form, so the links cannot be recovered from our database. No
        system is perfectly secure, and we cannot promise that a breach will never happen; if one
        affects your data, we will tell you as the law requires.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we change what we collect or why, we will update this page and its date. If a change
        affects data we already hold about you in a significant way, we will tell you by email where
        we have your address.
      </p>
    </LegalPage>
  );
}
