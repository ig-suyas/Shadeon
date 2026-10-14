import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/auth-forms";
import { PageShell } from "@/components/layout/page-shell";
import { emailEnabled, integrationStatus } from "@/server/env";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a free Shadeon account to copy the code for any shader.",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <PageShell
      title="Create a free account"
      lead="An account is free and unlocks the code for every shader."
    >
      <div className="max-w-[420px]">
        <SignUpForm google={integrationStatus.google} email={emailEnabled} />
      </div>
    </PageShell>
  );
}
