import "server-only";
import {
  createPublicKey,
  timingSafeEqual,
  verify,
  type JsonWebKey,
  type KeyObject,
} from "node:crypto";

/**
 * "Continue with Google" without a client secret: OpenID Connect with
 * `response_type=id_token`. Google signs an ID token and hands it to the
 * browser in the URL fragment; the browser passes it to our server, which
 * trusts nothing in it until every check below has passed:
 *
 * - the signature is RS256 by one of Google's published keys (no other
 *   algorithm is accepted, so "alg: none" and HMAC-confusion tricks fail),
 * - the issuer is Google, the audience is our client id,
 * - it has not expired and was not issued in the future,
 * - its nonce matches the one this browser was given (stops replay and
 *   token injection), and Google says the email address is verified.
 */

export const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
/** Allowed clock difference between Google and this server. */
const SKEW_SECONDS = 60;
const MAX_TOKEN_LENGTH = 4096;

export interface GoogleIdentity {
  sub: string;
  email: string;
}

export type KeyResolver = (kid: string) => Promise<KeyObject | null>;

interface VerifyOptions {
  clientId: string;
  nonce: string;
  now?: Date;
  keys?: KeyResolver;
}

function decodeJson(part: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Returns the verified identity, or null if anything at all is wrong. */
export async function verifyGoogleIdToken(
  token: unknown,
  { clientId, nonce, now = new Date(), keys = googleKeys }: VerifyOptions,
): Promise<GoogleIdentity | null> {
  if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];

  const header = decodeJson(headerPart);
  if (!header || header.alg !== "RS256" || typeof header.kid !== "string") return null;
  if (header.kid.length === 0 || header.kid.length > 128) return null;

  const key = await keys(header.kid);
  if (!key) return null;
  const signed = verify(
    "sha256",
    Buffer.from(`${headerPart}.${payloadPart}`),
    key,
    Buffer.from(signaturePart, "base64url"),
  );
  if (!signed) return null;

  const claims = decodeJson(payloadPart);
  if (!claims) return null;
  const seconds = Math.floor(now.getTime() / 1000);
  if (typeof claims.iss !== "string" || !ISSUERS.has(claims.iss)) return null;
  if (claims.aud !== clientId) return null;
  if (claims.azp !== undefined && claims.azp !== clientId) return null;
  if (typeof claims.exp !== "number" || claims.exp + SKEW_SECONDS < seconds) return null;
  if (typeof claims.iat !== "number" || claims.iat - SKEW_SECONDS > seconds) return null;
  if (typeof claims.nonce !== "string" || !sameString(claims.nonce, nonce)) return null;
  if (claims.email_verified !== true) return null;
  if (typeof claims.sub !== "string" || !/^[0-9A-Za-z_-]{1,255}$/.test(claims.sub)) return null;
  if (
    typeof claims.email !== "string" ||
    claims.email.length > 254 ||
    !claims.email.includes("@")
  ) {
    return null;
  }
  return { sub: claims.sub, email: claims.email.trim().toLowerCase() };
}

// Google's signing keys, cached in memory for as long as Google says (capped),
// and re-fetched at most once a minute when an unknown key id appears.
let cached: { keys: Map<string, KeyObject>; expiresAt: number } | null = null;
let lastFetch = 0;

async function fetchKeys(): Promise<void> {
  const response = await fetch(GOOGLE_JWKS_URL, {
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google keys answered ${response.status}`);
  const body = (await response.json()) as { keys?: unknown };
  const keys = new Map<string, KeyObject>();
  for (const jwk of Array.isArray(body.keys) ? body.keys : []) {
    if (typeof jwk !== "object" || jwk === null) continue;
    const { kid, kty, alg } = jwk as Record<string, unknown>;
    if (typeof kid !== "string" || kty !== "RSA" || (alg !== undefined && alg !== "RS256"))
      continue;
    keys.set(kid, createPublicKey({ key: jwk as JsonWebKey, format: "jwk" }));
  }
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get("cache-control") ?? "")?.[1]);
  const seconds = Number.isFinite(maxAge) ? Math.min(Math.max(maxAge, 300), 86_400) : 3600;
  cached = { keys, expiresAt: Date.now() + seconds * 1000 };
}

async function googleKeys(kid: string): Promise<KeyObject | null> {
  const fresh = cached && cached.expiresAt > Date.now();
  if (fresh && cached?.keys.has(kid)) return cached.keys.get(kid) ?? null;
  if (Date.now() - lastFetch > 60_000 || !fresh) {
    lastFetch = Date.now();
    await fetchKeys();
  }
  return cached?.keys.get(kid) ?? null;
}
