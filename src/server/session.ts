import "server-only";
import { cookies } from "next/headers";
import {
  createSession,
  deleteSession,
  SESSION_TTL_MS,
  sessionUser,
  type SessionView,
} from "./accounts";
import { getDatabase } from "./db/client";
import { isProduction } from "./env";
import { logFailure } from "./log";
import { isTokenShaped } from "./tokens";

/**
 * The session cookie: a random 256-bit token, HttpOnly (page scripts cannot
 * read it), SameSite=Lax (not sent on cross-site form posts or fetches), and
 * in production Secure with the __Host- prefix (HTTPS only, this exact host,
 * path /, so a subdomain cannot plant or overwrite it). The database stores
 * only its SHA-256.
 *
 * Development runs on http://localhost, where Secure cookies and the prefix
 * do not work in every browser, so it uses a plain name without Secure.
 */
export const SESSION_COOKIE = isProduction ? "__Host-shadeon_session" : "shadeon_session";

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Starts a session for the user and sets the cookie. Server Actions and Route Handlers only. */
export async function signIn(userId: string): Promise<void> {
  const db = await getDatabase();
  if (!db) throw new Error("no database");
  const { token } = await createSession(db, userId);
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(Math.floor(SESSION_TTL_MS / 1000)));
}

/** Ends the current session (database row and cookie). */
export async function signOut(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  store.set(SESSION_COOKIE, "", cookieOptions(0));
  if (!isTokenShaped(token)) return;
  const db = await getDatabase();
  if (db) await deleteSession(db, token);
}

/**
 * The signed-in user for this request, or null. Every protected operation
 * calls this on the server; nothing trusts the browser's idea of who it is.
 * A database failure counts as signed out (fails closed).
 */
export async function currentUser(): Promise<SessionView | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isTokenShaped(token)) return null;
  try {
    const db = await getDatabase();
    if (!db) return null;
    return await sessionUser(db, token);
  } catch (error) {
    logFailure("session lookup", error);
    return null;
  }
}
