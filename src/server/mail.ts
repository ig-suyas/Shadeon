import "server-only";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { env, isProduction } from "./env";
import { logFailure } from "./log";
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

interface Mail {
  to: string;
  subject: string;
  /** Paragraphs; a paragraph that is a link is written as { text, href }. */
  body: (string | { text: string; href: string })[];
  headers?: Record<string, string>;
  /** Short name for logs and the development outbox, for example "waitlist". */
  kind: string;
}

/**
 * Development without Resend: print the email to the server console, and
 * keep the latest one per address in .data/outbox/ (git-ignored) so the
 * end-to-end tests can follow its links. Production never does either.
 */
async function devDeliver(mail: Mail): Promise<void> {
  const lines = mail.body.map((part) =>
    typeof part === "string" ? part : `${part.text}: ${part.href}`,
  );
  console.info(`[dev] ${mail.kind} email for ${mail.to}\n  ${lines.join("\n  ")}`);
  if (env.NODE_ENV === "test") return;
  const [{ createHash }, path, fs] = await Promise.all([
    import("node:crypto"),
    import("node:path"),
    import("node:fs/promises"),
  ]);
  const directory = path.join(process.cwd(), ".data", "outbox");
  await fs.mkdir(directory, { recursive: true });
  const name = createHash("sha256").update(mail.to).digest("hex").slice(0, 24);
  const links = mail.body.flatMap((part) => (typeof part === "string" ? [] : [part.href]));
  await fs.writeFile(
    path.join(directory, `${name}.json`),
    JSON.stringify({ kind: mail.kind, subject: mail.subject, links }),
  );
}

/** Sends one email. Returns false if it could not be sent. */
async function deliver(mail: Mail): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    if (isProduction) return false;
    try {
      await devDeliver(mail);
    } catch (error) {
      logFailure("development outbox", error);
    }
    return true;
  }

  const text = mail.body
    .map((part) => (typeof part === "string" ? part : `${part.text}:\n${part.href}`))
    .join("\n\n");
  const html = mail.body
    .map((part) =>
      typeof part === "string"
        ? `<p>${escapeHtml(part)}</p>`
        : `<p><a href="${escapeHtml(part.href)}">${escapeHtml(part.text)}</a></p>`,
    )
    .join("");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [mail.to],
        subject: mail.subject,
        text,
        html,
        ...(mail.headers ? { headers: mail.headers } : {}),
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) console.error(`${mail.kind} email failed with status ${response.status}`);
    return response.ok;
  } catch (error) {
    logFailure(`${mail.kind} email`, error);
    return false;
  }
}

/** The double opt-in email for the waitlist. */
export async function sendWaitlistConfirmation(mail: WaitlistMail): Promise<boolean> {
  const links = waitlistLinks(mail);
  return deliver({
    kind: "waitlist",
    to: mail.email,
    subject: `Confirm your email for the ${SITE_NAME} Pro waitlist`,
    body: [
      `Confirm your place on the ${SITE_NAME} Pro waitlist:`,
      { text: "Confirm my email", href: links.confirm },
      "The link works for 7 days. If you did not ask for this, ignore this email and you will not hear from us again.",
      { text: "Remove this address", href: links.unsubscribe },
    ],
    headers: { "List-Unsubscribe": `<${links.unsubscribe}>` },
  });
}

/** Finishes creating an account. The link opens a page; the account is created by a button press. */
export async function sendSignupConfirmation(email: string, token: string): Promise<boolean> {
  return deliver({
    kind: "signup",
    to: email,
    subject: `Confirm your email to finish creating your ${SITE_NAME} account`,
    body: [
      `Someone, hopefully you, asked to create a ${SITE_NAME} account with this email address.`,
      { text: "Confirm my email", href: `${SITE_URL}/verify-email?token=${token}` },
      "The link works for 24 hours. If you did not ask for this, ignore this email: no account is created, and the request is deleted when the link expires.",
    ],
  });
}

/**
 * Sent instead of a confirmation when the address already has an account, so
 * the sign-up form answers the same whether or not the address is registered.
 */
export async function sendAlreadyRegistered(email: string): Promise<boolean> {
  return deliver({
    kind: "signup-existing",
    to: email,
    subject: `You already have a ${SITE_NAME} account`,
    body: [
      `Someone, hopefully you, tried to create a ${SITE_NAME} account with this email address, but it already has one.`,
      { text: "Sign in", href: `${SITE_URL}/login` },
      { text: "Forgot your password? Reset it", href: `${SITE_URL}/forgot-password` },
      "If this was not you, you can ignore this email. Your account has not changed.",
    ],
  });
}

export async function sendPasswordReset(email: string, token: string): Promise<boolean> {
  return deliver({
    kind: "reset",
    to: email,
    subject: `Reset your ${SITE_NAME} password`,
    body: [
      `Someone, hopefully you, asked to reset the password for your ${SITE_NAME} account.`,
      { text: "Choose a new password", href: `${SITE_URL}/reset-password?token=${token}` },
      "The link works for 30 minutes and only once. Choosing a new password signs you out everywhere. If you did not ask for this, ignore this email: your password has not changed.",
    ],
  });
}
