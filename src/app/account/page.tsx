import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AccountPanel } from "@/components/auth/account-panel";
import { PageShell } from "@/components/layout/page-shell";
import { emailEnabled } from "@/server/env";
import { currentUser } from "@/server/session";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

/** The page frame is static; the part that reads the session streams in behind Suspense. */
export default function AccountPage() {
  return (
    <PageShell title="Your account">
      <Suspense
        fallback={
          <div aria-busy="true" className="flex flex-col gap-4">
            <span className="sr-only">Loading your account</span>
            <div className="bg-bg-raised rounded-control h-6 w-72" />
            <div className="bg-bg-raised rounded-control h-6 w-48" />
          </div>
        }
      >
        <Account />
      </Suspense>
    </PageShell>
  );
}

async function Account() {
  // Request time only: the session check compares expiry times with "now".
  await connection();
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  // Only what the page shows: never the password hash or Google id.
  return (
    <AccountPanel
      email={user.email}
      hasPassword={user.hasPassword}
      hasGoogle={user.hasGoogle}
      emailEnabled={emailEnabled}
    />
  );
}
