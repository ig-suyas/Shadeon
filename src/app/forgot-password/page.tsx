import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Forgot your password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <PageShell
      title="Forgot your password"
      lead="Enter the email address of your account and we will send you a link to choose a new password."
    >
      <div className="max-w-[420px]">
        <ForgotPasswordForm />
      </div>
    </PageShell>
  );
}
