import "server-only";
import { headers } from "next/headers";
import type { FormState } from "@/lib/form-types";
import { withinLimit } from "./rate-limit";
import { verifyTurnstile } from "./turnstile";

/**
 * Checks shared by every form action. This is not a "use server" file, so
 * nothing here can be called from the browser on its own.
 */

export const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";
export const CHECK_FAILED = "We could not confirm you are human. Reload the page and try again.";

/** Humans take longer than this to fill a form; many bots do not. */
const MIN_FILL_MS = 1500;

export async function clientIp(): Promise<string | null> {
  const list = await headers();
  // The first entry is set by the hosting platform's proxy.
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip") || null;
}

export function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.slice(0, 5000) : "";
}

/** Text the user typed, echoed back after an error so the form keeps it. */
export function echo(form: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, text(form, key)]));
}

/**
 * Shared gate for every form: honeypot, minimum fill time, per-IP rate limit,
 * Turnstile. Returns an error state to send back, "silent" when the request
 * should be dropped while appearing to succeed, or null when it may proceed.
 */
export async function guard(
  form: FormData,
  scope: string,
  limit: { max: number; windowSeconds: number },
  options: { timing?: boolean } = {},
): Promise<FormState | "silent" | null> {
  // "website" is hidden from people; only automated fillers complete it.
  if (text(form, "website") !== "") return "silent";
  // Off for sign-in: a password manager fills and submits faster than a person types.
  if (options.timing !== false) {
    const elapsed = Number(text(form, "elapsed"));
    if (Number.isFinite(elapsed) && elapsed > 0 && elapsed < MIN_FILL_MS) return "silent";
  }

  const ip = await clientIp();
  if (!(await withinLimit(scope, ip ?? "unknown", limit))) {
    return { status: "error", message: TOO_MANY };
  }
  if (!(await verifyTurnstile(form.get("cf-turnstile-response"), ip))) {
    return { status: "error", message: CHECK_FAILED };
  }
  return null;
}
