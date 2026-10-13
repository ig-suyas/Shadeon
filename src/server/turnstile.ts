import "server-only";
import { env } from "./env";

/**
 * Verifies a Cloudflare Turnstile token on the server. When no secret is
 * configured the check is skipped (the honeypot, timing check and rate limits
 * still apply). When it is configured, any failure to verify rejects the form.
 */
export async function verifyTurnstile(token: unknown, ip: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
    if (ip) body.set("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: unknown };
    return result.success === true;
  } catch {
    return false;
  }
}
