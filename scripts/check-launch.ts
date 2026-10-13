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
  blockers.push("DATABASE_URL is not set: the waitlist, request and contact forms will not work.");
}
if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
  blockers.push(
    "RESEND_API_KEY / EMAIL_FROM are not set: waitlist confirmation emails cannot be sent.",
  );
}
if (!process.env.CRON_SECRET) {
  blockers.push("CRON_SECRET is not set: the daily retention job will not run.");
}
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  warnings.push("Upstash is not configured: rate limits are per server instance only.");
}
if (!process.env.TURNSTILE_SECRET_KEY || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
  warnings.push(
    "Turnstile is not configured: forms rely on the honeypot, timing check and rate limits.",
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
