import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth-types";
import { SITE_URL } from "@/lib/site";
import { env, isProduction } from "@/server/env";
import { clientIp } from "@/server/form-guard";
import { GOOGLE_AUTHORIZE_URL } from "@/server/google";
import {
  encodeOAuthState,
  OAUTH_COOKIE,
  OAUTH_MAX_AGE_SECONDS,
  oauthCookieOptions,
} from "@/server/oauth";
import { withinLimit } from "@/server/rate-limit";
import { createToken } from "@/server/tokens";

/**
 * Starts "Continue with Google": remembers a random state and nonce in a
 * short-lived cookie, then sends the browser to Google. Google sends it back
 * to /auth/google/callback with the ID token in the URL fragment (which never
 * reaches any server log). The redirect address is fixed, never taken from
 * the request in production, and Google also checks it against the client's
 * registered list.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const back = (error: string): Response =>
    NextResponse.redirect(new URL(`/login?error=${error}`, request.nextUrl.origin), 303);
  if (!env.GOOGLE_CLIENT_ID) return back("google-unavailable");
  const ip = await clientIp();
  if (!(await withinLimit("google-start", ip ?? "unknown", { max: 20, windowSeconds: 600 }))) {
    return back("rate");
  }

  const state = createToken();
  const nonce = createToken();
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const origin = isProduction ? SITE_URL : request.nextUrl.origin;
  const url = new URL(GOOGLE_AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${origin}/auth/google/callback`,
    response_type: "id_token",
    response_mode: "fragment",
    scope: "openid email",
    state,
    nonce,
    prompt: "select_account",
  }).toString();

  const response = NextResponse.redirect(url, 303);
  response.cookies.set(
    OAUTH_COOKIE,
    encodeOAuthState({ state, nonce, next }),
    oauthCookieOptions(OAUTH_MAX_AGE_SECONDS),
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
