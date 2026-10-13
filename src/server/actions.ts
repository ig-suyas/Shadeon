"use server";

import { headers } from "next/headers";
import type { z } from "zod";
import {
  contactSchema,
  fieldErrors,
  requestSchema,
  waitlistSchema,
  type FormState,
} from "@/lib/forms";
import { getDatabase, type Database } from "./db/client";
import { sendWaitlistConfirmation } from "./mail";
import { withinLimit } from "./rate-limit";
import {
  addMessage,
  addShaderRequest,
  confirmWaitlist,
  joinWaitlist,
  leaveWaitlist,
  purgeExpired,
} from "./repository";
import { isTokenShaped } from "./tokens";
import { verifyTurnstile } from "./turnstile";

const UNAVAILABLE = "This form is not available right now. Please try again later.";
const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";
const CHECK_FAILED = "We could not confirm you are human. Reload the page and try again.";

/** Retention is enforced here, after writes, so no scheduled job is needed. A failure never blocks the form. */
async function tidy(db: Database): Promise<void> {
  try {
    await purgeExpired(db);
  } catch (error) {
    console.error("retention purge failed:", error instanceof Error ? error.message : error);
  }
}

/** Humans take longer than this to fill a form; many bots do not. */
const MIN_FILL_MS = 1500;

async function clientIp(): Promise<string | null> {
  const list = await headers();
  // The first entry is set by the hosting platform's proxy.
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip") || null;
}

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.slice(0, 5000) : "";
}

/** Text the user typed, echoed back after an error so the form keeps it. */
function echo(form: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, text(form, key)]));
}

/**
 * Shared gate for every form: honeypot, minimum fill time, per-IP rate limit,
 * Turnstile. Returns an error state to send back, "silent" when the request
 * should be dropped while appearing to succeed, or null when it may proceed.
 */
async function guard(
  form: FormData,
  scope: string,
  limit: { max: number; windowSeconds: number },
): Promise<FormState | "silent" | null> {
  // "website" is hidden from people; only automated fillers complete it.
  if (text(form, "website") !== "") return "silent";
  const elapsed = Number(text(form, "elapsed"));
  if (Number.isFinite(elapsed) && elapsed > 0 && elapsed < MIN_FILL_MS) return "silent";

  const ip = await clientIp();
  if (!(await withinLimit(scope, ip ?? "unknown", limit))) {
    return { status: "error", message: TOO_MANY };
  }
  if (!(await verifyTurnstile(form.get("cf-turnstile-response"), ip))) {
    return { status: "error", message: CHECK_FAILED };
  }
  return null;
}

function invalid<T>(form: FormData, keys: string[], result: z.ZodSafeParseError<T>): FormState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    errors: fieldErrors(result.error),
    values: echo(form, keys),
  };
}

const WAITLIST_DONE =
  "Check your inbox. If that address is not on the list yet, a confirmation link is on its way.";

export async function joinWaitlistAction(_previous: FormState, form: FormData): Promise<FormState> {
  const keys = ["email"];
  const parsed = waitlistSchema.safeParse({
    email: text(form, "email"),
    consent: form.get("consent"),
  });
  if (!parsed.success) return invalid(form, keys, parsed);

  const blocked = await guard(form, "waitlist", { max: 5, windowSeconds: 600 });
  if (blocked === "silent") return { status: "success", message: WAITLIST_DONE };
  if (blocked) return { ...blocked, values: echo(form, keys) };
  // A second limit per address stops one inbox being targeted from many IPs.
  if (!(await withinLimit("waitlist-email", parsed.data.email, { max: 3, windowSeconds: 3600 }))) {
    return { status: "success", message: WAITLIST_DONE };
  }

  try {
    const db = await getDatabase();
    if (!db) return { status: "error", message: UNAVAILABLE, values: echo(form, keys) };
    const mail = await joinWaitlist(db, parsed.data.email);
    if (mail && !(await sendWaitlistConfirmation(mail))) {
      return { status: "error", message: UNAVAILABLE, values: echo(form, keys) };
    }
    await tidy(db);
    // The same answer whether or not the address was already there.
    return { status: "success", message: WAITLIST_DONE };
  } catch (error) {
    console.error("waitlist action failed:", error instanceof Error ? error.message : error);
    return { status: "error", message: UNAVAILABLE, values: echo(form, keys) };
  }
}

export async function requestShaderAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const keys = ["title", "details", "referenceUrl", "email"];
  const parsed = requestSchema.safeParse(echo(form, keys));
  if (!parsed.success) return invalid(form, keys, parsed);

  const done: FormState = {
    status: "success",
    message: "Thank you. Your request is in the queue for the next batch of shaders.",
  };
  const blocked = await guard(form, "request", { max: 5, windowSeconds: 3600 });
  if (blocked === "silent") return done;
  if (blocked) return { ...blocked, values: echo(form, keys) };

  try {
    const db = await getDatabase();
    if (!db) return { status: "error", message: UNAVAILABLE, values: echo(form, keys) };
    await addShaderRequest(db, parsed.data);
    await tidy(db);
    return done;
  } catch (error) {
    console.error("request action failed:", error instanceof Error ? error.message : error);
    return { status: "error", message: UNAVAILABLE, values: echo(form, keys) };
  }
}

export async function contactAction(_previous: FormState, form: FormData): Promise<FormState> {
  const keys = ["topic", "message", "email"];
  const parsed = contactSchema.safeParse(echo(form, keys));
  if (!parsed.success) return invalid(form, keys, parsed);

  const done: FormState = {
    status: "success",
    message: parsed.data.email
      ? "Thank you. Your message has been received, and we will reply by email if it needs an answer."
      : "Thank you. Your message has been received.",
  };
  const blocked = await guard(form, "contact", { max: 5, windowSeconds: 3600 });
  if (blocked === "silent") return done;
  if (blocked) return { ...blocked, values: echo(form, keys) };

  try {
    const db = await getDatabase();
    if (!db) return { status: "error", message: UNAVAILABLE, values: echo(form, keys) };
    await addMessage(db, parsed.data);
    await tidy(db);
    return done;
  } catch (error) {
    console.error("contact action failed:", error instanceof Error ? error.message : error);
    return { status: "error", message: UNAVAILABLE, values: echo(form, keys) };
  }
}

const LINK_INVALID = "This link is not valid any more. It may have expired or already been used.";

async function tokenAction(
  form: FormData,
  scope: string,
  run: (token: string) => Promise<boolean>,
  success: string,
): Promise<FormState> {
  const ip = await clientIp();
  if (!(await withinLimit(scope, ip ?? "unknown", { max: 20, windowSeconds: 600 }))) {
    return { status: "error", message: TOO_MANY };
  }
  const token = form.get("token");
  if (!isTokenShaped(token)) return { status: "error", message: LINK_INVALID };
  try {
    return (await run(token))
      ? { status: "success", message: success }
      : { status: "error", message: LINK_INVALID };
  } catch (error) {
    console.error(`${scope} action failed:`, error instanceof Error ? error.message : error);
    return { status: "error", message: UNAVAILABLE };
  }
}

/** Runs from a button press, not from opening the link, so mail scanners cannot trigger it. */
export async function confirmWaitlistAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  return tokenAction(
    form,
    "waitlist-confirm",
    async (token) => {
      const db = await getDatabase();
      if (!db) throw new Error("no database");
      return confirmWaitlist(db, token);
    },
    "You are on the list. We will email you once, when Pro is ready.",
  );
}

export async function leaveWaitlistAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  return tokenAction(
    form,
    "waitlist-leave",
    async (token) => {
      const db = await getDatabase();
      if (!db) throw new Error("no database");
      return leaveWaitlist(db, token);
    },
    "Your address has been removed. Nothing about it is kept.",
  );
}
