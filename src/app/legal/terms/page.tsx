import type { Metadata } from "next";
import Link from "next/link";
import { ContactAddress, LegalPage } from "@/components/layout/legal-page";
import { LEGAL } from "@/content/legal";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms that apply when you use the Shadeon website and its shader code.",
  alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      lead="These terms apply when you use this website. The shader code itself is covered by its own, very permissive license."
    >
      <h2>1. Who we are</h2>
      <p>
        Shadeon is operated by <strong>{LEGAL.operator}</strong> (&quot;we&quot;, &quot;us&quot;).
        You can reach us at <ContactAddress />.
      </p>

      <h2>2. Using the site</h2>
      <p>
        By using this website you agree to these terms. If you do not agree, please do not use it.
        You can explore the shaders without an account; copying their code needs a free account.
        Accounts and the forms on the site are for people aged {LEGAL.minimumAge} or over.
      </p>

      <h2>3. Your account</h2>
      <ul>
        <li>An account is for one person. Give an email address that is yours.</li>
        <li>
          Keep your password to yourself and tell us if you think someone else is using your
          account. You are responsible for what is done with it.
        </li>
        <li>
          Do not use accounts to get around the site&apos;s limits, for example by creating many of
          them or by downloading the code in bulk with automated tools.
        </li>
        <li>
          You can delete your account at any time on your account page. We may suspend or delete an
          account that breaks these terms; where reasonable we will tell you first.
        </li>
        <li>
          An account is free. Code you have copied stays yours under the MIT License, even after
          your account is deleted.
        </li>
      </ul>

      <h2>4. The shader code</h2>
      <p>
        The shader code offered on this site is licensed to you under the MIT License, as explained
        on the <Link href="/legal/license">license page</Link>. Where these terms and the MIT
        License say different things about the code, the MIT License applies to the code.
      </p>

      <h2>5. The website and the brand</h2>
      <p>
        The website itself (its design, text and layout) and the Shadeon name and logo belong to us
        and are not covered by the MIT License. You may link to the site and describe your project
        as using Shadeon shaders. You may not copy the site, or suggest that we endorse your
        product.
      </p>

      <h2>6. Fair use of the site</h2>
      <p>Please do not:</p>
      <ul>
        <li>break, overload or probe the site, or get around its rate limits or human checks;</li>
        <li>send spam, unlawful content or other people&apos;s personal data through the forms;</li>
        <li>use automated tools to submit the forms;</li>
        <li>use the site to break the law or infringe anyone&apos;s rights.</li>
      </ul>
      <p>We may block access that does any of these.</p>

      <h2>7. What you send us</h2>
      <p>
        If you send a shader request, feedback or an idea, you agree that we may use it to improve
        Shadeon, including building and publishing a shader based on it, without owing you payment
        or credit. Do not send anything confidential or anything you do not have the right to share.
        How we handle personal data is described in the{" "}
        <Link href="/legal/privacy">privacy policy</Link>.
      </p>

      <h2>8. The Pro waitlist</h2>
      <p>
        Joining the waitlist is not a purchase and creates no obligation on either side. A paid plan
        may change, be delayed or never be released.
      </p>

      <h2>9. No warranty</h2>
      <p>
        The site and the code are provided as they are and as available. To the extent the law
        allows, we give no warranties of any kind, including that the site will always be available
        or that the code is error-free or fit for a particular purpose. You are responsible for
        testing the code in your own project.
      </p>

      <h2>10. Limit of liability</h2>
      <p>
        To the extent the law allows, we are not liable for indirect or consequential loss, loss of
        profit, or loss of data arising from your use of the site or the code. Nothing in these
        terms limits liability that cannot be limited by law.
      </p>

      <h2>11. Copyright complaints</h2>
      <p>
        If you believe something on this site infringes your copyright, write to <ContactAddress />{" "}
        with a link to the material, a description of your work, and your contact details. We will
        review it and remove anything that should not be here.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may change the site, the shaders offered and these terms. When the terms change we will
        update this page and its date. Continuing to use the site after a change means you accept
        the new terms.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These terms are governed by the laws of <strong>{LEGAL.governingLaw}</strong>, and the
        courts there have jurisdiction, without removing any protection that the consumer law of
        your own country gives you.
      </p>
    </LegalPage>
  );
}
