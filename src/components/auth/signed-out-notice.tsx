"use client";

import { useEffect } from "react";
import { markSignedOut } from "@/lib/session-client";

/** Tells the header (and any code panel) that this browser is signed out now. */
export function SignedOutNotice() {
  useEffect(() => {
    markSignedOut();
  }, []);
  return null;
}
