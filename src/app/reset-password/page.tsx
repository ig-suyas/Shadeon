import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
  // The address bar holds a one-time token: never send it to other sites.
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <PageShell
      title="Choose a new password"
      lead="Choosing a new password signs you out on every device, then signs you in here."
    >
      <div className="max-w-[420px]">
        <ResetPasswordForm />
      </div>
    </PageShell>
  );
}
