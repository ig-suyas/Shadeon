import type { Metadata } from "next";
import { WaitlistTokenForm } from "@/components/forms/forms";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
  // The address bar holds a one-time token: never send it to other sites.
  referrer: "no-referrer",
};

export default function ConfirmPage() {
  return (
    <PageShell
      title="Confirm your email"
      lead="Press the button to join the Shadeon Pro waitlist. You will get one email, when Pro is ready."
    >
      <WaitlistTokenForm mode="confirm" />
    </PageShell>
  );
}
