import "server-only";
import { isProduction } from "./env";
import { isTokenShaped } from "./tokens";

/**
 * The short-lived cookie that ties a Google sign-in to the browser that
 * started it: the random `state` (stops login CSRF, where an attacker signs
 * you into their account) and `nonce` (stops a stolen or replayed ID token
 * being used), plus where to go afterwards. HttpOnly, SameSite=Lax, ten
 * minutes, deleted as soon as it is used.
 */
export const OAUTH_COOKIE = isProduction ? "__Host-shadeon_oauth" : "shadeon_oauth";
export const OAUTH_MAX_AGE_SECONDS = 600;

export interface OAuthState {
  state: string;
  nonce: string;
  next: string;
}

export function oauthCookieOptions(maxAge: number) {
  return { httpOnly: true, secure: isProduction, sameSite: "lax" as const, path: "/", maxAge };
}

export function encodeOAuthState({ state, nonce, next }: OAuthState): string {
  return `${state}.${nonce}.${Buffer.from(next, "utf8").toString("base64url")}`;
}

export function decodeOAuthState(value: string | undefined): OAuthState | null {
  if (!value || value.length > 1024) return null;
  const [state, nonce, next, extra] = value.split(".");
  if (extra !== undefined || !isTokenShaped(state) || !isTokenShaped(nonce) || !next) return null;
  if (!/^[A-Za-z0-9_-]*$/.test(next)) return null;
  return { state, nonce, next: Buffer.from(next, "base64url").toString("utf8") };
}
