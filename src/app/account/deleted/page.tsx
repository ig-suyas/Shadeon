import type { Metadata } from "next";
import Link from "next/link";
import { SignedOutNotice } from "@/components/auth/signed-out-notice";
import { PageShell } from "@/components/layout/page-shell";
import { button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Account deleted",
  robots: { index: false, follow: false },
};

export default function AccountDeletedPage() {
  return (
    <PageShell
      title="Your account has been deleted"
      lead="Your account, its sign-in sessions and any unused email links are gone. Code you copied stays yours under the MIT License."
    >
      <SignedOutNotice />
      <Link href="/shaders" className={button("outline")}>
        Browse shaders
      </Link>
    </PageShell>
  );
}
