"use client";

import { UserCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useSession } from "@/lib/session-client";
import { cn } from "@/lib/cn";

/**
 * "Sign in" (an outlined pill, so it reads as a button) or "Account" in the
 * header. The header is part of every static page, so the session is asked
 * for from the browser after load instead of making every page render per
 * request.
 */
export function AccountLink() {
  const session = useSession();
  const signedIn = session.status === "signed-in";
  return (
    <Link
      href={signedIn ? "/account" : "/login"}
      aria-label={signedIn ? "Account" : "Sign in"}
      title={signedIn ? `Signed in as ${session.email}` : undefined}
      className={cn(
        "text-text-muted hover:text-text rounded-pill inline-flex h-9 items-center gap-1.5 text-sm whitespace-nowrap transition-colors duration-(--duration-fast)",
        signedIn
          ? "hover:bg-text/6 px-2.5 max-sm:w-9 max-sm:justify-center sm:px-3"
          : "border-line-strong text-text hover:border-text border px-3.5",
      )}
      data-testid="header-account"
    >
      {signedIn ? <UserCircleIcon size={18} aria-hidden="true" /> : null}
      {/* Phones get the account icon alone; "Sign in" always shows its label. */}
      <span className={signedIn ? "max-sm:hidden" : undefined}>
        {signedIn ? "Account" : "Sign in"}
      </span>
    </Link>
  );
}
