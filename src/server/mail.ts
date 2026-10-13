import "server-only";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { env, isProduction } from "./env";
import type { WaitlistMail } from "./repository";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function waitlistLinks(mail: WaitlistMail): { confirm: string; unsubscribe: string } {
  return {
    confirm: `${SITE_URL}/waitlist/confirm?token=${mail.confirmToken}`,
    unsubscribe: `${SITE_URL}/waitlist/unsubscribe?token=${mail.unsubscribeToken}`,
  };
}

/**
 * Sends the double opt-in email. Returns false if it could not be sent.
 * Without Resend configured, development prints the links to the server
 * console instead; production sends nothing and reports failure.
 */
export async function sendWaitlistConfirmation(mail: WaitlistMail): Promise<boolean> {
  const links = waitlistLinks(mail);
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    if (isProduction) return false;
    console.info(
      `[dev] waitlist email for ${mail.email}\n  confirm: ${links.confirm}\n  unsubscribe: ${links.unsubscribe}`,
    );
    return true;
  }

  const text = [
    `Confirm your place on the ${SITE_NAME} Pro waitlist:`,
    links.confirm,
    "",
    "The link works for 7 days. If you did not ask for this, ignore this email and you will not hear from us again.",
    "",
    `Remove this address: ${links.unsubscribe}`,
  ].join("\n");
  const html = [
    `<p>Confirm your place on the ${SITE_NAME} Pro waitlist:</p>`,
    `<p><a href="${escapeHtml(links.confirm)}">Confirm my email</a></p>`,
    "<p>The link works for 7 days. If you did not ask for this, ignore this email and you will not hear from us again.</p>",
    `<p><a href="${escapeHtml(links.unsubscribe)}">Remove this address</a></p>`,
  ].join("");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [mail.email],
        subject: `Confirm your email for the ${SITE_NAME} Pro waitlist`,
        text,
        html,
        headers: { "List-Unsubscribe": `<${links.unsubscribe}>` },
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) console.error(`waitlist email failed with status ${response.status}`);
    return response.ok;
  } catch (error) {
    console.error("waitlist email failed:", error instanceof Error ? error.message : error);
    return false;
  }
}
