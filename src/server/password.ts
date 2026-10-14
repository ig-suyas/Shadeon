import "server-only";
import bcrypt from "bcryptjs";
import { PASSWORD } from "@/lib/auth-types";

/** bcrypt work factor. Each step doubles the time; 12 is about 250 ms per hash on a server. */
export const BCRYPT_COST = 12;

/** True when bcrypt would read the whole password (it ignores bytes after 72). */
export function fitsBcrypt(password: string): boolean {
  return new TextEncoder().encode(password).length <= PASSWORD.maxBytes;
}

/** Hashes a new password with a fresh random salt. Never log or return the input. */
export async function hashPassword(password: string): Promise<string> {
  if (!fitsBcrypt(password)) throw new Error("password longer than bcrypt reads");
  return bcrypt.hash(password, BCRYPT_COST);
}

let dummy: Promise<string> | null = null;

/**
 * Checks a password against a stored hash. When there is no hash (no such
 * account, or a Google-only account) it still runs one full bcrypt
 * comparison against a throwaway hash, so the response time does not reveal
 * whether an account exists.
 */
export async function verifyPassword(
  password: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!fitsBcrypt(password)) {
    // Still spend the same time, then refuse: no stored password can be this long.
    await bcrypt.compare("x", await (dummy ??= bcrypt.hash("unused-password", BCRYPT_COST)));
    return false;
  }
  if (!hash) {
    await bcrypt.compare(password, await (dummy ??= bcrypt.hash("unused-password", BCRYPT_COST)));
    return false;
  }
  return bcrypt.compare(password, hash);
}
