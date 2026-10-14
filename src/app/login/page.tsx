import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/auth-forms";
import { PageShell } from "@/components/layout/page-shell";
import { emailEnabled, integrationStatus } from "@/server/env";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Shadeon to copy the code for any shader.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <PageShell
      title="Sign in"
      lead="Every shader is free to explore. Sign in to copy its React, JavaScript or GLSL code."
    >
      <div className="max-w-[420px]">
        <SignInForm google={integrationStatus.google} email={emailEnabled} />
      </div>
    </PageShell>
  );
}
