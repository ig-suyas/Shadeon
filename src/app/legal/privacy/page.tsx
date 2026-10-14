import type { Metadata } from "next";
import Link from "next/link";
import { ContactAddress, LegalPage } from "@/components/layout/legal-page";
import { LEGAL, RETENTION } from "@/content/legal";
import { PASSWORD } from "@/lib/auth-types";

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
      lead="Shadeon is built to need very little about you. An account holds only your email address, and there is no advertising and no tracking. This page lists everything that is collected."
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

      <h3>If you create an account</h3>
      <p>
        You can explore every shader without an account. To see and copy the code you need a free
        account, which you can create with an email address and password, or with Google.
      </p>
      <ul>
        <li>
          <strong>Your email address</strong>, to identify your account, to sign you in, and to send
          you the emails the account needs (confirming your address, resetting your password). We do
          not send newsletters or marketing to account holders.
        </li>
        <li>
          <strong>Your password, only in scrambled form.</strong> We store a bcrypt hash of it, from
          which the password cannot be read back. Nobody at Shadeon can see your password.
        </li>
        <li>
          <strong>If you use Google:</strong> Google tells us your email address, that Google has
          verified it, and a number that identifies your Google account to us. We ask Google for
          nothing else: not your name, photo or contacts.
        </li>
        <li>
          <strong>Sign-in sessions.</strong> When you sign in we store a scrambled copy of a random
          session key, with when it was created and when it expires, so we know the browser holding
          the matching cookie is you.
        </li>
        <li>
          <strong>Your acceptance of the terms:</strong> which version of the Terms of use and this
          policy you accepted, and when.
        </li>
        <li>
          <strong>One-time email links</strong> (to confirm your address or reset your password),
          stored only in scrambled form. A sign-up that is never confirmed keeps your address and
          password hash only inside its link record, which expires after 24 hours; no account is
          created.
        </li>
      </ul>
      <p>
        We use this to provide the account you asked for and to keep it secure. We do not use it for
        anything else.
      </p>

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
          When you submit a form or try to sign in, we count attempts per network address and, for
          the waitlist and accounts, per email address or account, for a short time. The counters
          are keyed by a scrambled (hashed) version of the address, not the address itself, and
          expire within an hour.
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
        <li>We do not ask for your name. An account holds only what is listed above.</li>
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
          <strong>Account:</strong> until you delete it. Deleting it on your account page removes
          the account, its password hash, its Google link, its sessions and its email links at once.
        </li>
        <li>
          <strong>Sign-in sessions:</strong> until you sign out, or at most 30 days.
        </li>
        <li>
          <strong>Unconfirmed sign-ups:</strong> the link record expires after 24 hours and is
          deleted within a day after that. Password reset links expire after 30 minutes.
        </li>
        <li>
          <strong>Abuse counters:</strong> up to one hour.
        </li>
      </ul>

      <p>
        Our database provider keeps short-term backups so the site can recover from a failure.
        Deleted data disappears from them when they expire, within {LEGAL.backupRetentionDays}{" "}
        {LEGAL.backupRetentionDays === "1" ? "day" : "days"}, and is not used for anything in the
        meantime.
      </p>

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
          <strong>Neon</strong>: the database that holds accounts, waitlist addresses, requests and
          messages.
        </li>
        <li>
          <strong>Resend</strong>: sending account emails (confirmations and password resets) and
          the waitlist emails.
        </li>
        <li>
          <strong>Upstash</strong>: the short-lived abuse counters.
        </li>
        <li>
          <strong>Cloudflare</strong>: the Turnstile check on forms, when active.
        </li>
      </ul>
      <p>
        If you choose <strong>Continue with Google</strong>, you sign in on Google&apos;s own pages,
        and Google handles that under its own privacy policy. Google then tells us only what is
        listed above.
      </p>
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
          <strong>Delete your account</strong> yourself at any time on your{" "}
          <Link href="/account">account page</Link>. It takes effect at once.
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
        The site is served over an encrypted connection. Passwords are stored only as bcrypt hashes
        (passwords must be at least {PASSWORD.minLength} characters). Sign-in sessions, confirmation
        links and removal links are stored only in scrambled (hashed) form, so they cannot be
        recovered from our database. The session cookie cannot be read by scripts on the page. No
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
