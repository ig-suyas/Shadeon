"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { TERMS_VERSION } from "@/content/legal";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/auth-schemas";
import { safeNext } from "@/lib/auth-types";
import { fieldErrors } from "@/lib/forms";
import type { FormState } from "@/lib/form-types";
import {
  changePassword,
  completeReset,
  completeSignup,
  deleteAccount,
  deleteUserSessions,
  emailHasAccount,
  findUserForSignIn,
  passwordHashFor,
  signInWithGoogle,
  startReset,
  startSignup,
} from "./accounts";
import { authEvent } from "./audit";
import { getDatabase } from "./db/client";
import { emailEnabled, env } from "./env";
import { clientIp, echo, guard, text, TOO_MANY } from "./form-guard";
import { verifyGoogleIdToken } from "./google";
import { logFailure } from "./log";
import { sendAlreadyRegistered, sendPasswordReset, sendSignupConfirmation } from "./mail";
import { decodeOAuthState, OAUTH_COOKIE, oauthCookieOptions } from "./oauth";
import { hashPassword, verifyPassword } from "./password";
import { withinLimit } from "./rate-limit";
import { currentUser, signIn, signOut } from "./session";
import { isTokenShaped } from "./tokens";

/**
 * Every account action. Each one validates its input with Zod, applies its
 * own rate limits, and takes the user from the session cookie on the server,
 * never from anything the browser sends. Next.js rejects Server Action calls
 * whose Origin does not match the site, which is the CSRF protection here,
 * on top of the SameSite=Lax session cookie.
 *
 * Messages are written so that no answer reveals whether an email address
 * has an account, except to someone who has just proved they own it.
 */

const UNAVAILABLE = "Accounts are not available right now. Please try again later.";
const WRONG = "Email or password is incorrect.";
const LINK_INVALID = "This link is not valid any more. It may have expired or already been used.";
const SIGN_IN_AGAIN = "Your session has ended. Please sign in again.";
/** Google-only accounts prove who they are by having signed in this recently. */
const RECENT_SIGN_IN_MS = 15 * 60 * 1000;

function invalid(form: FormData, keys: string[], errors: Record<string, string>): FormState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    errors,
    // Only non-secret fields are ever echoed back; passwords are never returned.
    values: echo(form, keys),
  };
}

/** Raw password field: not trimmed, bounded so a huge value cannot reach bcrypt. */
function password(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.slice(0, 1024) : "";
}

/** Shown when email and password accounts are switched off (no email sending yet). */
const EMAIL_OFF: FormState = {
  status: "error",
  message: "Email sign-in is not available yet. Please continue with Google.",
};

// ------------------------------------------------------------------ sign-up

const SIGNUP_DONE =
  "Check your inbox. We have sent a link to finish creating your account. It works for 24 hours.";

export async function signUpAction(_previous: FormState, form: FormData): Promise<FormState> {
  if (!emailEnabled) return EMAIL_OFF;
  const parsed = signUpSchema.safeParse({
    email: text(form, "email"),
    password: password(form, "password"),
    consent: form.get("consent"),
  });
  if (!parsed.success) return invalid(form, ["email"], fieldErrors(parsed.error));

  const blocked = await guard(form, "signup", { max: 5, windowSeconds: 3600 });
  if (blocked === "silent") return { status: "success", message: SIGNUP_DONE };
  if (blocked) return { ...blocked, values: echo(form, ["email"]) };
  const { email } = parsed.data;
  // Per address as well, so one inbox cannot be flooded from many networks.
  if (!(await withinLimit("signup-email", email, { max: 3, windowSeconds: 3600 }))) {
    return { status: "success", message: SIGNUP_DONE };
  }

  try {
    const db = await getDatabase();
    if (!db) return { status: "error", message: UNAVAILABLE, values: echo(form, ["email"]) };
    // Hashed in both branches so the response time is the same.
    const passwordHash = await hashPassword(parsed.data.password);
    if (await emailHasAccount(db, email)) {
      after(() => sendAlreadyRegistered(email));
    } else {
      const token = await startSignup(db, { email, passwordHash, termsVersion: TERMS_VERSION });
      after(() => sendSignupConfirmation(email, token));
    }
    authEvent("signup_requested");
    return { status: "success", message: SIGNUP_DONE };
  } catch (error) {
    logFailure("sign-up action", error);
    return { status: "error", message: UNAVAILABLE, values: echo(form, ["email"]) };
  }
}

/** Runs from a button press on the page the email link opens, never from opening the link. */
export async function verifyEmailAction(_previous: FormState, form: FormData): Promise<FormState> {
  if (!emailEnabled) return EMAIL_OFF;
  const ip = await clientIp();
  if (!(await withinLimit("verify-email", ip ?? "unknown", { max: 20, windowSeconds: 600 }))) {
    return { status: "error", message: TOO_MANY };
  }
  const token = form.get("token");
  if (!isTokenShaped(token)) return { status: "error", message: LINK_INVALID };
  try {
    const db = await getDatabase();
    if (!db) return { status: "error", message: UNAVAILABLE };
    const result = await completeSignup(db, token);
    if (result.status === "invalid") return { status: "error", message: LINK_INVALID };
    if (result.status === "exists") {
      return {
        status: "error",
        message: "This email address already has an account. Sign in instead.",
      };
    }
    await signOut();
    await signIn(result.userId);
    authEvent("signup_completed", result.userId);
    return { status: "success", message: "Your account is ready.", redirectTo: "/shaders" };
  } catch (error) {
    logFailure("verify-email action", error);
    return { status: "error", message: UNAVAILABLE };
  }
}

// ------------------------------------------------------------------ sign-in

export async function signInAction(_previous: FormState, form: FormData): Promise<FormState> {
  if (!emailEnabled) return EMAIL_OFF;
  const keys = ["email"];
  const parsed = signInSchema.safeParse({
    email: text(form, "email"),
    password: password(form, "password"),
  });
  if (!parsed.success) return invalid(form, keys, fieldErrors(parsed.error));

  const blocked = await guard(form, "signin", { max: 20, windowSeconds: 600 }, { timing: false });
  if (blocked === "silent") return { status: "error", message: WRONG, values: echo(form, keys) };
  if (blocked) return { ...blocked, values: echo(form, keys) };
  const { email } = parsed.data;
  // Guessing one account's password from many addresses is limited here.
  if (!(await withinLimit("signin-email", email, { max: 10, windowSeconds: 900 }))) {
    return { status: "error", message: TOO_MANY, values: echo(form, keys) };
  }

  try {
    const db = await getDatabase();
    if (!db) return { status: "error", message: UNAVAILABLE, values: echo(form, keys) };
    const user = await findUserForSignIn(db, email);
    // Runs a full bcrypt comparison even when there is no such account.
    const ok = await verifyPassword(parsed.data.password, user?.passwordHash);
    if (!user || !ok) {
      authEvent("signin_failed");
      return {
        status: "error",
        message: `${WRONG} If you have just signed up, use the link in the email first.`,
        values: echo(form, keys),
      };
    }
    // A fresh session every time: a token set before sign-in is never promoted.
    await signOut();
    await signIn(user.id);
    authEvent("signin", user.id);
    return { status: "success", redirectTo: safeNext(text(form, "next")) };
  } catch (error) {
    logFailure("sign-in action", error);
    return { status: "error", message: UNAVAILABLE, values: echo(form, keys) };
  }
}

export interface GoogleSignInResult {
  ok: boolean;
  message?: string;
  redirectTo?: string;
}

const GOOGLE_FAILED = "Signing in with Google did not complete. Please try again.";

function sameValue(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Finishes "Continue with Google". The callback page passes on the ID token
 * and state from the URL fragment; they are checked against the cookie set
 * when this browser started the sign-in, then the token is verified.
 */
export async function googleSignInAction(input: {
  idToken: unknown;
  state: unknown;
}): Promise<GoogleSignInResult> {
  const store = await cookies();
  const saved = decodeOAuthState(store.get(OAUTH_COOKIE)?.value);
  // One use only, whatever happens next.
  store.set(OAUTH_COOKIE, "", oauthCookieOptions(0));

  const ip = await clientIp();
  if (!(await withinLimit("google-signin", ip ?? "unknown", { max: 20, windowSeconds: 600 }))) {
    return { ok: false, message: TOO_MANY };
  }
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId || !saved) return { ok: false, message: GOOGLE_FAILED };
  if (typeof input?.state !== "string" || !sameValue(input.state, saved.state)) {
    authEvent("signin_google_failed");
    return { ok: false, message: GOOGLE_FAILED };
  }

  try {
    const identity = await verifyGoogleIdToken(input.idToken, { clientId, nonce: saved.nonce });
    if (!identity) {
      authEvent("signin_google_failed");
      return { ok: false, message: GOOGLE_FAILED };
    }
    const db = await getDatabase();
    if (!db) return { ok: false, message: UNAVAILABLE };
    const result = await signInWithGoogle(db, identity, TERMS_VERSION);
    if (result.status === "conflict") {
      authEvent("signin_google_failed");
      return {
        ok: false,
        message:
          "This email address belongs to an account linked to a different Google account. Sign in with your password or that Google account.",
      };
    }
    await signOut();
    await signIn(result.userId);
    authEvent(result.created ? "signup_completed" : "signin_google", result.userId);
    return { ok: true, redirectTo: safeNext(saved.next) };
  } catch (error) {
    logFailure("google sign-in action", error);
    return { ok: false, message: GOOGLE_FAILED };
  }
}

// ---------------------------------------------------------- password reset

const RESET_REQUESTED =
  "If an account uses that address, we have sent it a link to choose a new password. The link works for 30 minutes.";

export async function requestResetAction(_previous: FormState, form: FormData): Promise<FormState> {
  if (!emailEnabled) return EMAIL_OFF;
  const parsed = forgotPasswordSchema.safeParse({ email: text(form, "email") });
  if (!parsed.success) return invalid(form, ["email"], fieldErrors(parsed.error));

  const blocked = await guard(form, "reset", { max: 5, windowSeconds: 3600 });
  if (blocked === "silent") return { status: "success", message: RESET_REQUESTED };
  if (blocked) return { ...blocked, values: echo(form, ["email"]) };
  const { email } = parsed.data;
  if (!(await withinLimit("reset-email", email, { max: 3, windowSeconds: 3600 }))) {
    return { status: "success", message: RESET_REQUESTED };
  }

  try {
    const db = await getDatabase();
    if (!db) return { status: "error", message: UNAVAILABLE, values: echo(form, ["email"]) };
    const token = await startReset(db, email);
    // Sent after the response, so its timing does not show whether the account exists.
    if (token) after(() => sendPasswordReset(email, token));
    authEvent("reset_requested");
    return { status: "success", message: RESET_REQUESTED };
  } catch (error) {
    logFailure("reset request action", error);
    return { status: "error", message: UNAVAILABLE, values: echo(form, ["email"]) };
  }
}

export async function resetPasswordAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  if (!emailEnabled) return EMAIL_OFF;
  const ip = await clientIp();
  if (!(await withinLimit("reset-password", ip ?? "unknown", { max: 20, windowSeconds: 600 }))) {
    return { status: "error", message: TOO_MANY };
  }
  const token = form.get("token");
  if (!isTokenShaped(token)) return { status: "error", message: LINK_INVALID };
  const parsed = resetPasswordSchema.safeParse({
    password: password(form, "password"),
    confirm: password(form, "confirm"),
  });
  if (!parsed.success) return invalid(form, [], fieldErrors(parsed.error));

  try {
    const db = await getDatabase();
    if (!db) return { status: "error", message: UNAVAILABLE };
    const passwordHash = await hashPassword(parsed.data.password);
    const userId = await completeReset(db, token, passwordHash);
    if (!userId) return { status: "error", message: LINK_INVALID };
    await signOut();
    await signIn(userId);
    authEvent("reset_completed", userId);
    return {
      status: "success",
      message: "Your password has been changed.",
      redirectTo: "/account",
    };
  } catch (error) {
    logFailure("reset password action", error);
    return { status: "error", message: UNAVAILABLE };
  }
}

// ----------------------------------------------------------- signed in only

export async function signOutAction(): Promise<void> {
  const user = await currentUser();
  await signOut();
  if (user) authEvent("signout", user.id);
}

export async function signOutEverywhereAction(): Promise<void> {
  const user = await currentUser();
  if (user) {
    const db = await getDatabase();
    if (db) await deleteUserSessions(db, user.id);
    authEvent("signout_everywhere", user.id);
  }
  await signOut();
}

export async function changePasswordAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { status: "error", message: SIGN_IN_AGAIN, redirectTo: "/login?next=/account" };
  // A new password is only useful for email sign-in, which needs email sending.
  if (!emailEnabled && !user.hasPassword) return EMAIL_OFF;
  if (!(await withinLimit("change-password", user.id, { max: 5, windowSeconds: 900 }))) {
    return { status: "error", message: TOO_MANY };
  }
  const parsed = changePasswordSchema.safeParse({
    current: password(form, "current"),
    password: password(form, "password"),
    confirm: password(form, "confirm"),
  });
  if (!parsed.success) return invalid(form, [], fieldErrors(parsed.error));

  try {
    const db = await getDatabase();
    if (!db) return { status: "error", message: UNAVAILABLE };
    if (user.hasPassword) {
      const ok = await verifyPassword(parsed.data.current, await passwordHashFor(db, user.id));
      if (!ok) {
        return { status: "error", errors: { current: "That is not your current password." } };
      }
    } else if (Date.now() - user.sessionCreatedAt.getTime() > RECENT_SIGN_IN_MS) {
      return {
        status: "error",
        message: "To add a password, sign out and sign in with Google again first.",
      };
    }
    await changePassword(db, user.id, await hashPassword(parsed.data.password), user.sessionId);
    authEvent("password_changed", user.id);
    return {
      status: "success",
      message: "Your password has been changed. Other devices have been signed out.",
    };
  } catch (error) {
    logFailure("change password action", error);
    return { status: "error", message: UNAVAILABLE };
  }
}

/**
 * Deletes the signed-in account and everything stored with it. Needs the
 * password (or, for a Google-only account, a sign-in in the last 15 minutes)
 * and the word "delete" typed, so a borrowed open session or a stray click
 * cannot do it.
 */
export async function deleteAccountAction(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { status: "error", message: SIGN_IN_AGAIN, redirectTo: "/login?next=/account" };
  if (!(await withinLimit("delete-account", user.id, { max: 5, windowSeconds: 900 }))) {
    return { status: "error", message: TOO_MANY };
  }
  if (text(form, "confirm").trim().toLowerCase() !== "delete") {
    return { status: "error", errors: { confirm: 'Type "delete" to confirm.' } };
  }

  try {
    const db = await getDatabase();
    if (!db) return { status: "error", message: UNAVAILABLE };
    if (user.hasPassword) {
      const ok = await verifyPassword(
        password(form, "password"),
        await passwordHashFor(db, user.id),
      );
      if (!ok) return { status: "error", errors: { password: "That is not your password." } };
    } else if (Date.now() - user.sessionCreatedAt.getTime() > RECENT_SIGN_IN_MS) {
      return {
        status: "error",
        message:
          "For your safety, sign out and sign in with Google again, then delete the account within 15 minutes.",
      };
    }
    await deleteAccount(db, user.id);
    // Clears the cookie with the same attributes it was set with (the session
    // row itself went with the account).
    await signOut();
    authEvent("account_deleted", user.id);
  } catch (error) {
    logFailure("delete account action", error);
    return { status: "error", message: UNAVAILABLE };
  }
  // Outside the try: redirect() works by throwing. Going straight to the
  // confirmation stops the now signed-out account page from re-rendering.
  redirect("/account/deleted");
}
