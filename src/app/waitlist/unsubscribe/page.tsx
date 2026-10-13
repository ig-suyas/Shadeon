import type { Metadata } from "next";
import { WaitlistTokenForm } from "@/components/forms/forms";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Leave the waitlist",
  robots: { index: false, follow: false },
  // The address bar holds a personal token: never send it to other sites.
  referrer: "no-referrer",
};

export default function UnsubscribePage() {
  return (
    <PageShell
      title="Leave the waitlist"
      lead="Press the button to remove your email address. It is deleted, not just switched off."
    >
      <WaitlistTokenForm mode="leave" />
    </PageShell>
  );
}
