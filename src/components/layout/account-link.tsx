"use client";

import { UserCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useSession } from "@/lib/session-client";

/**
 * "Sign in" or "Account" in the header. The header is part of every static
 * page, so the session is asked for from the browser after load instead of
 * making every page render per request.
 */
export function AccountLink() {
  const session = useSession();
  const signedIn = session.status === "signed-in";
  return (
    <Link
      href={signedIn ? "/account" : "/login"}
      aria-label={signedIn ? "Account" : "Sign in"}
      title={signedIn ? `Signed in as ${session.email}` : undefined}
      className="text-text-muted hover:text-text rounded-control inline-flex items-center gap-1.5 py-2 text-sm transition-colors duration-150 max-sm:size-9 max-sm:justify-center sm:px-3"
      data-testid="header-account"
    >
      {/* Phones get the icon alone; the label returns from the sm breakpoint up. */}
      <UserCircleIcon size={18} aria-hidden="true" className={signedIn ? "" : "sm:hidden"} />
      <span className="max-sm:hidden">{signedIn ? "Account" : "Sign in"}</span>
    </Link>
  );
}
