import type { Metadata } from "next";
import { GoogleCallback } from "@/components/auth/auth-forms";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Signing in",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function GoogleCallbackPage() {
  return (
    <PageShell title="Signing in">
      <GoogleCallback />
    </PageShell>
  );
}
