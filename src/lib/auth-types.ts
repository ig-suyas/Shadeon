/**
 * Account constants shared by the forms and the server. No validation library
 * here, so client components can import this file without pulling Zod into
 * the browser (the rules themselves live in `src/lib/auth-schemas.ts`).
 */

export const PASSWORD = {
  minLength: 12,
  /**
   * bcrypt only reads the first 72 bytes of a password and silently ignores
   * the rest, so longer passwords are refused instead of being cut short.
   */
  maxBytes: 72,
} as const;

/** Where people land after signing in when no safe destination was given. */
export const DEFAULT_AFTER_SIGN_IN = "/shaders";

/**
 * Returns `value` only if it is a path on this site, otherwise the default.
 * Every "come back here after signing in" value passes through this, on the
 * server as well as in the browser, so sign-in can never redirect elsewhere
 * (no "//evil.example", "/\evil.example", "https://…", "javascript:" or
 * control characters).
 */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  // Control characters (tabs and newlines are stripped by URL parsers, which
  // can turn "/\t/evil.example" into "//evil.example").
  if (/[\u0000-\u001f\u007f]/.test(value)) return DEFAULT_AFTER_SIGN_IN;
  try {
    const base = "https://shadeon.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return DEFAULT_AFTER_SIGN_IN;
    const path = `${url.pathname}${url.search}${url.hash}`;
    // Never send someone back into the sign-in pages themselves.
    if (/^\/(login|signup|auth)(\/|$|\?|#)/.test(path)) return DEFAULT_AFTER_SIGN_IN;
    return path;
  } catch {
    return DEFAULT_AFTER_SIGN_IN;
  }
}

/** The sign-in page, remembering where to come back to. */
export function loginHref(next?: string): string {
  const target = safeNext(next);
  return target === DEFAULT_AFTER_SIGN_IN ? "/login" : `/login?next=${encodeURIComponent(target)}`;
}
