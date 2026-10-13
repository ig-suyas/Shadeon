import "server-only";
import { z } from "zod";

/**
 * Server-side configuration, validated once. Every integration is optional so
 * the site runs locally with no accounts; `integrationStatus` reports what is
 * active. Nothing here is ever sent to the browser.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Postgres connection string (Neon). Without it, development uses a local embedded database. */
  DATABASE_URL: z.string().url().optional(),
  /** Upstash Redis REST credentials for rate limiting across server instances. */
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  /** Mixed into hashed rate-limit keys so raw IP addresses are never stored. */
  RATE_LIMIT_SALT: z.string().min(16).optional(),
  /** Cloudflare Turnstile secret. The site key is NEXT_PUBLIC_TURNSTILE_SITE_KEY. */
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  /** Resend API key and the verified sender, for example "Shadeon <hello@shadeon.dev>". */
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  /** Shared secret for the daily retention job. Vercel Cron sends it as a bearer token. */
  CRON_SECRET: z.string().min(16).optional(),
});

function emptyToUndefined(source: NodeJS.ProcessEnv): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, value === "" ? undefined : value]),
  );
}

const parsed = schema.safeParse(emptyToUndefined(process.env));
if (!parsed.success) {
  // Names only: never print values, they may be secrets.
  const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid server environment variables: ${names}`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";

export const integrationStatus = {
  database: Boolean(env.DATABASE_URL),
  rateLimitStore: Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
  turnstile: Boolean(env.TURNSTILE_SECRET_KEY),
  email: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
};
