import { and, eq, gt } from "drizzle-orm";
import type { Database } from "./db/client";
import { messages, shaderRequests, waitlist } from "./db/schema";
import { createToken, hashToken } from "./tokens";

/** Bump when the consent wording on the waitlist form changes. */
export const CONSENT_VERSION = "2026-10-14";

const CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESEND_INTERVAL_MS = 10 * 60 * 1000;

export interface WaitlistMail {
  email: string;
  confirmToken: string;
  unsubscribeToken: string;
}

/**
 * Adds an address to the waitlist, or refreshes a pending one.
 *
 * Returns the mail to send, or null when nothing should be sent: the address
 * is already confirmed, or a confirmation went out in the last ten minutes.
 * Callers must show the same response in every case so the form cannot be
 * used to test whether an address is on the list, or to flood an inbox.
 */
export async function joinWaitlist(
  db: Database,
  email: string,
  now: Date = new Date(),
): Promise<WaitlistMail | null> {
  const [existing] = await db.select().from(waitlist).where(eq(waitlist.email, email)).limit(1);
  if (existing?.status === "confirmed") return null;
  if (existing?.lastSentAt && now.getTime() - existing.lastSentAt.getTime() < RESEND_INTERVAL_MS) {
    return null;
  }

  const confirmToken = createToken();
  const unsubscribeToken = createToken();
  const values = {
    email,
    status: "pending" as const,
    confirmTokenHash: hashToken(confirmToken),
    confirmExpiresAt: new Date(now.getTime() + CONFIRM_TTL_MS),
    unsubscribeTokenHash: hashToken(unsubscribeToken),
    consentVersion: CONSENT_VERSION,
    consentAt: now,
    lastSentAt: now,
  };
  // The unique index on email makes two simultaneous sign-ups safe.
  await db
    .insert(waitlist)
    .values(values)
    .onConflictDoUpdate({
      target: waitlist.email,
      set: values,
      setWhere: eq(waitlist.status, "pending"),
    });
  return { email, confirmToken, unsubscribeToken };
}

/** Confirms a pending address. The token works once and expires after seven days. */
export async function confirmWaitlist(
  db: Database,
  token: string,
  now: Date = new Date(),
): Promise<boolean> {
  const updated = await db
    .update(waitlist)
    .set({ status: "confirmed", confirmedAt: now, confirmTokenHash: null, confirmExpiresAt: null })
    .where(
      and(
        eq(waitlist.confirmTokenHash, hashToken(token)),
        eq(waitlist.status, "pending"),
        gt(waitlist.confirmExpiresAt, now),
      ),
    )
    .returning({ id: waitlist.id });
  return updated.length > 0;
}

/** Removes the address completely. Nothing about it is kept. */
export async function leaveWaitlist(db: Database, token: string): Promise<boolean> {
  const removed = await db
    .delete(waitlist)
    .where(eq(waitlist.unsubscribeTokenHash, hashToken(token)))
    .returning({ id: waitlist.id });
  return removed.length > 0;
}

export async function addShaderRequest(
  db: Database,
  input: { title: string; details: string; referenceUrl?: string; email?: string },
): Promise<void> {
  await db.insert(shaderRequests).values({
    title: input.title,
    details: input.details,
    referenceUrl: input.referenceUrl ?? null,
    email: input.email ?? null,
  });
}

export async function addMessage(
  db: Database,
  input: {
    topic: (typeof messages.topic.enumValues)[number];
    message: string;
    email?: string;
  },
): Promise<void> {
  await db.insert(messages).values({
    topic: input.topic,
    message: input.message,
    email: input.email ?? null,
  });
}
