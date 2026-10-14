import type { Metadata } from "next";
import { VerifyEmailForm } from "@/components/auth/auth-forms";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
  // The address bar holds a one-time token: never send it to other sites.
  referrer: "no-referrer",
};

export default function VerifyEmailPage() {
  return (
    <PageShell
      title="Confirm your email"
      lead="Press the button to finish creating your Shadeon account."
    >
      <VerifyEmailForm />
    </PageShell>
  );
}
