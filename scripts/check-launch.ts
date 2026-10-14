// Launch gate: `npm run check:launch`. Exits with an error while anything that
// must be settled before going live is still open. Run it before deploying to
// production; it is not part of the normal build so development is not blocked.
import { LEGAL, unresolvedLegalFields } from "@/content/legal";
import { SITE_URL } from "@/lib/site";

const blockers: string[] = [];
const warnings: string[] = [];

for (const field of unresolvedLegalFields()) {
  blockers.push(`src/content/legal.ts: "${field}" is still a placeholder.`);
}
if (LEGAL.draft) {
  blockers.push(
    "src/content/legal.ts: draft is true. Set it to false once a lawyer has reviewed the legal pages.",
  );
}
if (!process.env.NEXT_PUBLIC_SITE_URL) {
  blockers.push(`NEXT_PUBLIC_SITE_URL is not set (falling back to ${SITE_URL}).`);
}
if (!process.env.DATABASE_URL) {
  blockers.push(
    "DATABASE_URL is not set: accounts (and so the code), the waitlist, request and contact forms will not work.",
  );
}
const emailOn = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
if (!emailOn) {
  // Allowed (owner, 2026-10-14: no domain yet): the site runs Google-only.
  warnings.push(
    "RESEND_API_KEY / EMAIL_FROM are not set: email and password accounts and the waitlist are off; Google is the only sign-in.",
  );
  if (!process.env.GOOGLE_CLIENT_ID) {
    blockers.push("Neither email (Resend) nor GOOGLE_CLIENT_ID is set: nobody could sign in.");
  }
}
if (!process.env.CRON_SECRET) {
  blockers.push("CRON_SECRET is not set: the daily retention job will not run.");
}
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  // Serverless instances each keep their own in-memory counters, so without a
  // shared store the limits can be multiplied by spreading requests out.
  blockers.push("Upstash is not configured: rate limits would be per server instance only.");
}
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  blockers.push(
    "AUTH_SECRET is not set (32+ random characters): signed-in visitors get no shadcn install command.",
  );
}
if (!process.env.GOOGLE_CLIENT_ID) {
  warnings.push(
    'GOOGLE_CLIENT_ID is not set: "Continue with Google" is hidden; email sign-in still works.',
  );
} else {
  warnings.push(
    "Google sign-in: check that <site>/auth/google/callback is an authorised redirect URI of the OAuth client.",
  );
}
const turnstileSecret = Boolean(process.env.TURNSTILE_SECRET_KEY);
const turnstileSiteKey = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
if (turnstileSecret !== turnstileSiteKey) {
  blockers.push(
    "Set both Turnstile keys or neither: with only the secret every form fails, with only the site key nothing is checked.",
  );
} else if (!turnstileSecret) {
  warnings.push(
    "Turnstile is not configured: forms rely on the honeypot, timing check and rate limits.",
  );
}
if (process.env.DATABASE_MIGRATION_URL) {
  warnings.push(
    "DATABASE_MIGRATION_URL is set here. It is for running migrations only; do not set it on the deployed site.",
  );
}
if (process.env.DATABASE_URL && process.env.DATABASE_URL === process.env.DATABASE_MIGRATION_URL) {
  blockers.push(
    "DATABASE_URL is the owner connection. Use the shadeon_app role (scripts/db-app-role.sql).",
  );
}
if (!process.env.RATE_LIMIT_SALT) {
  warnings.push("RATE_LIMIT_SALT is not set: rate-limit keys change on every restart.");
}

for (const line of warnings) console.warn(`warning  ${line}`);
for (const line of blockers) console.error(`blocker  ${line}`);
if (blockers.length > 0) {
  console.error(`\n${blockers.length} blocker(s). Not ready to launch.`);
  process.exit(1);
}
console.log("No launch blockers found.");
