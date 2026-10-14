import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env, isProduction } from "./env";

/**
 * Short-lived links for the shadcn CLI. The CLI cannot send our session
 * cookie, so a signed-in visitor gets an install command whose URL carries a
 * signed token: valid for one shader, one account and one hour. Nothing is
 * stored; the signature (HMAC-SHA256 with AUTH_SECRET) is the proof.
 *
 * Production without AUTH_SECRET issues and accepts no links (fails closed).
 * Development without it uses a random key, so links die on restart.
 */

export const INSTALL_TTL_SECONDS = 60 * 60;

// On globalThis: Next.js loads each route as its own module instance, and the
// route that issues a link must share the key with the route that checks it.
const shared = globalThis as typeof globalThis & { __shadeonInstallKey?: Buffer };
const devKey = (shared.__shadeonInstallKey ??= randomBytes(32));

function key(): Buffer | string | null {
  if (env.AUTH_SECRET) return env.AUTH_SECRET;
  return isProduction ? null : devKey;
}

function sign(secret: Buffer | string, shaderId: string, userId: string, expires: number): string {
  return createHmac("sha256", secret)
    .update(`shadeon-install:${shaderId}:${userId}:${expires}`)
    .digest("base64url");
}

export function createInstallToken(
  shaderId: string,
  userId: string,
  now: Date = new Date(),
): string | null {
  const secret = key();
  if (!secret) return null;
  const expires = Math.floor(now.getTime() / 1000) + INSTALL_TTL_SECONDS;
  return `${expires}.${userId}.${sign(secret, shaderId, userId, expires)}`;
}

/** The account id the token was issued to, or null if it is not valid for this shader now. */
export function verifyInstallToken(
  token: unknown,
  shaderId: string,
  now: Date = new Date(),
): string | null {
  const secret = key();
  if (!secret || typeof token !== "string" || token.length > 200) return null;
  const match = /^(\d{10})\.([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return null;
  const [, expiresText, userId, signature] = match as unknown as [string, string, string, string];
  const expires = Number(expiresText);
  if (expires < Math.floor(now.getTime() / 1000)) return null;
  const expected = Buffer.from(sign(secret, shaderId, userId, expires));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? userId : null;
}
