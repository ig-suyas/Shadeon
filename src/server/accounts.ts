import { and, eq, gt, isNull, lt, ne, sql } from "drizzle-orm";
import type { Database } from "./db/client";
import { authTokens, sessions, users } from "./db/schema";
import { createToken, hashToken } from "./tokens";

/**
 * Every database operation on accounts, sessions and one-time links. Each
 * one-time step is a single atomic statement (DELETE ... RETURNING, or INSERT
 * ... ON CONFLICT), so a link cannot be used twice and two simultaneous
 * requests cannot create two accounts, even without transactions (the Neon
 * HTTP driver has none).
 *
 * Callers authorise first: nothing here checks who is asking. Functions take
 * the user id from the verified session, never from the browser.
 */

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SIGNUP_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_TTL_MS = 30 * 60 * 1000;

/** What the rest of the app may know about a signed-in person. Never the hash. */
export interface AccountView {
  id: string;
  email: string;
  hasPassword: boolean;
  hasGoogle: boolean;
}

export interface SessionView extends AccountView {
  sessionId: string;
  sessionCreatedAt: Date;
}

function view(row: {
  id: string;
  email: string;
  passwordHash: string | null;
  googleSub: string | null;
}): AccountView {
  return {
    id: row.id,
    email: row.email,
    hasPassword: row.passwordHash !== null,
    hasGoogle: row.googleSub !== null,
  };
}

/** The stored row including the password hash: for the sign-in check only. */
export async function findUserForSignIn(
  db: Database,
  email: string,
): Promise<{ id: string; passwordHash: string | null } | null> {
  const [row] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return row ?? null;
}

export async function findUserById(db: Database, id: string): Promise<AccountView | null> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      googleSub: users.googleSub,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row ? view(row) : null;
}

export async function passwordHashFor(db: Database, userId: string): Promise<string | null> {
  const [row] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.passwordHash ?? null;
}

export async function emailHasAccount(db: Database, email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return Boolean(row);
}

// ---------------------------------------------------------------- sessions

/** Starts a session and returns the token for the cookie (only its hash is stored). */
export async function createSession(
  db: Database,
  userId: string,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = createToken();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, createdAt: now, expiresAt });
  return { token, expiresAt };
}

/** The account behind a session token, or null if the session is unknown or expired. */
export async function sessionUser(
  db: Database,
  token: string,
  now: Date = new Date(),
): Promise<SessionView | null> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      googleSub: users.googleSub,
      sessionId: sessions.id,
      sessionCreatedAt: sessions.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, now)))
    .limit(1);
  if (!row) return null;
  return { ...view(row), sessionId: row.sessionId, sessionCreatedAt: row.sessionCreatedAt };
}

export async function deleteSession(db: Database, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

/** Signs a user out everywhere, optionally keeping one session (the one in use). */
export async function deleteUserSessions(
  db: Database,
  userId: string,
  keepSessionId?: string,
): Promise<void> {
  await db
    .delete(sessions)
    .where(
      keepSessionId
        ? and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId))
        : eq(sessions.userId, userId),
    );
}

// ------------------------------------------------------------------ sign-up

/**
 * Records a pending sign-up and returns the token for the email link. The
 * account itself is created by `completeSignup`, so an address nobody
 * confirms never becomes an account. Earlier pending links for the address
 * stay valid until they expire: each one carries its own password.
 */
export async function startSignup(
  db: Database,
  input: { email: string; passwordHash: string; termsVersion: string },
  now: Date = new Date(),
): Promise<string> {
  const token = createToken();
  await db.insert(authTokens).values({
    tokenHash: hashToken(token),
    purpose: "signup",
    email: input.email,
    passwordHash: input.passwordHash,
    termsVersion: input.termsVersion,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SIGNUP_TTL_MS),
  });
  return token;
}

export type SignupResult =
  { status: "created"; userId: string } | { status: "exists" } | { status: "invalid" };

/**
 * Uses a sign-up link: creates the account with the password chosen when the
 * link was requested. If the address already has an account with a password,
 * nothing changes ("exists"). If it has a Google-only account, the password is
 * added to it: whoever holds the link controls the inbox, which is the same
 * proof a password reset relies on.
 */
export async function completeSignup(
  db: Database,
  token: string,
  now: Date = new Date(),
): Promise<SignupResult> {
  const [pending] = await db
    .delete(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        eq(authTokens.purpose, "signup"),
        gt(authTokens.expiresAt, now),
      ),
    )
    .returning();
  if (!pending?.passwordHash || !pending.termsVersion) return { status: "invalid" };

  const [created] = await db
    .insert(users)
    .values({
      email: pending.email,
      passwordHash: pending.passwordHash,
      emailVerifiedAt: now,
      termsVersion: pending.termsVersion,
      termsAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash: pending.passwordHash, updatedAt: now },
      setWhere: isNull(users.passwordHash),
    })
    .returning({ id: users.id });
  // The other pending links for this address have nothing left to do.
  await db
    .delete(authTokens)
    .where(and(eq(authTokens.email, pending.email), eq(authTokens.purpose, "signup")));
  return created ? { status: "created", userId: created.id } : { status: "exists" };
}

// ------------------------------------------------------------ password reset

/**
 * Creates a password-reset link for the account with this address, replacing
 * any earlier one. Returns null when there is no such account; callers must
 * answer the same either way.
 */
export async function startReset(
  db: Database,
  email: string,
  now: Date = new Date(),
): Promise<string | null> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) return null;
  await db
    .delete(authTokens)
    .where(and(eq(authTokens.userId, user.id), eq(authTokens.purpose, "reset")));
  const token = createToken();
  await db.insert(authTokens).values({
    tokenHash: hashToken(token),
    purpose: "reset",
    email,
    userId: user.id,
    createdAt: now,
    expiresAt: new Date(now.getTime() + RESET_TTL_MS),
  });
  return token;
}

/**
 * Uses a reset link: sets the new password and ends every session, so anyone
 * who had the old password is signed out. Returns the user id, or null if the
 * link is unknown, used or expired.
 */
export async function completeReset(
  db: Database,
  token: string,
  passwordHash: string,
  now: Date = new Date(),
): Promise<string | null> {
  const [used] = await db
    .delete(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        eq(authTokens.purpose, "reset"),
        gt(authTokens.expiresAt, now),
      ),
    )
    .returning({ userId: authTokens.userId });
  if (!used?.userId) return null;
  const updated = await db
    .update(users)
    .set({ passwordHash, updatedAt: now })
    .where(eq(users.id, used.userId))
    .returning({ id: users.id });
  if (updated.length === 0) return null;
  await deleteUserSessions(db, used.userId);
  await db
    .delete(authTokens)
    .where(and(eq(authTokens.userId, used.userId), eq(authTokens.purpose, "reset")));
  return used.userId;
}

/** Changes the password of a signed-in user and signs out their other sessions. */
export async function changePassword(
  db: Database,
  userId: string,
  passwordHash: string,
  keepSessionId: string,
  now: Date = new Date(),
): Promise<void> {
  await db.update(users).set({ passwordHash, updatedAt: now }).where(eq(users.id, userId));
  await deleteUserSessions(db, userId, keepSessionId);
  await db
    .delete(authTokens)
    .where(and(eq(authTokens.userId, userId), eq(authTokens.purpose, "reset")));
}

// ------------------------------------------------------------------- Google

export type GoogleResult =
  { status: "ok"; userId: string; created: boolean } | { status: "conflict" };

/**
 * Signs in with a verified Google identity: the account already linked to
 * this Google id; else the account with the same (Google-verified) address,
 * which gets linked; else a new account. An address whose account is already
 * linked to a different Google id is refused rather than taken over.
 */
export async function signInWithGoogle(
  db: Database,
  identity: { sub: string; email: string },
  termsVersion: string,
  now: Date = new Date(),
): Promise<GoogleResult> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const [linked] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.googleSub, identity.sub))
      .limit(1);
    if (linked) return { status: "ok", userId: linked.id, created: false };

    const [link] = await db
      .update(users)
      .set({ googleSub: identity.sub, updatedAt: now })
      .where(and(eq(users.email, identity.email), isNull(users.googleSub)))
      .returning({ id: users.id });
    if (link) return { status: "ok", userId: link.id, created: false };

    if (await emailHasAccount(db, identity.email)) return { status: "conflict" };

    const [created] = await db
      .insert(users)
      .values({
        email: identity.email,
        googleSub: identity.sub,
        emailVerifiedAt: now,
        termsVersion,
        termsAcceptedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: users.id });
    if (created) return { status: "ok", userId: created.id, created: true };
    // Lost a race with a simultaneous sign-in for the same person: look again.
  }
  return { status: "conflict" };
}

// ----------------------------------------------------------------- deletion

/**
 * Deletes an account completely: the users row, and through the foreign keys
 * every session and reset link. Pending sign-up links for the address go too.
 * Only rows belonging to this user id and its own address are touched.
 */
export async function deleteAccount(db: Database, userId: string): Promise<boolean> {
  const [removed] = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ email: users.email });
  if (!removed) return false;
  await db.delete(authTokens).where(eq(authTokens.email, removed.email));
  return true;
}

/** Removes expired sessions and links (part of the daily retention purge). */
export async function purgeExpiredAuth(db: Database, now: Date = new Date()): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  await db.delete(authTokens).where(lt(authTokens.expiresAt, now));
}

/** Counts, for tests and monitoring only. */
export async function countSessions(db: Database, userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessions)
    .where(eq(sessions.userId, userId));
  return row?.count ?? 0;
}
