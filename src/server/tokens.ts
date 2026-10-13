import { createHash, randomBytes } from "node:crypto";

/** A random URL-safe token (256 bits). */
export function createToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only the hash is stored, so a database leak does not reveal usable links. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isTokenShaped(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}
