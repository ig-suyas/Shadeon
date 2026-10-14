"use client";

import { GoogleLogoIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { FormFrame, TextField } from "@/components/forms/form-parts";
import { button } from "@/components/ui/button";
import { LEGAL } from "@/content/legal";
import { PASSWORD, safeNext } from "@/lib/auth-types";
import { IDLE, LIMITS, type FormState } from "@/lib/form-types";
import {
  googleSignInAction,
  requestResetAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
  verifyEmailAction,
} from "@/server/auth-actions";

const subscribeNever = (): (() => void) => () => {};
const readNext = (): string => safeNext(new URLSearchParams(window.location.search).get("next"));
const readToken = (): string => new URLSearchParams(window.location.search).get("token") ?? "";
const readError = (): string => new URLSearchParams(window.location.search).get("error") ?? "";
const empty = (): string => "";

/** "Come back here after signing in", read from the address bar after hydration. */
function useNext(): string {
  return useSyncExternalStore(subscribeNever, readNext, () => "/shaders");
}

/**
 * After a successful sign-in the browser loads the destination fresh, so
 * every part of the page (header, code panels) starts from the new session.
 */
function useRedirectOnSuccess(state: FormState): void {
  useEffect(() => {
    if (state.status === "success" && state.redirectTo) {
      window.location.replace(safeNext(state.redirectTo));
    }
  }, [state]);
}

const legal = (
  <>
    <Link href="/legal/terms" className="text-text underline underline-offset-4">
      Terms of use
    </Link>{" "}
    and{" "}
    <Link href="/legal/privacy" className="text-text underline underline-offset-4">
      Privacy policy
    </Link>
  </>
);

export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const next = useNext();
  return (
    <a
      href={`/api/auth/google?next=${encodeURIComponent(next)}`}
      className={button("outline", "md", "w-full")}
      data-testid="google-sign-in"
    >
      <GoogleLogoIcon size={18} weight="bold" aria-hidden="true" />
      {label}
    </a>
  );
}

function Divider() {
  return (
    <div className="text-text-faint flex items-center gap-3 text-xs tracking-wide uppercase">
      <span className="bg-line h-px flex-1" aria-hidden="true" />
      or
      <span className="bg-line h-px flex-1" aria-hidden="true" />
    </div>
  );
}

const ERRORS: Record<string, string> = {
  "google-unavailable":
    "Signing in with Google is not available right now. Use your email instead.",
  rate: "Too many attempts. Please wait a few minutes and try again.",
};

export function SignInForm({ google }: { google: boolean }) {
  const [state, action, pending] = useActionState(signInAction, IDLE);
  const next = useNext();
  const error = useSyncExternalStore(subscribeNever, readError, empty);
  useRedirectOnSuccess(state);

  if (state.status === "success") {
    return (
      <p role="status" className="text-lg">
        Signed in. Taking you back now.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {ERRORS[error] ? (
        <p
          role="alert"
          className="border-danger text-danger rounded-control border px-3 py-2.5 text-sm"
        >
          {ERRORS[error]}
        </p>
      ) : null}
      {google ? (
        <>
          <GoogleButton />
          <Divider />
        </>
      ) : null}
      <FormFrame state={state} action={action} pending={pending} submitLabel="Sign in">
        <input type="hidden" name="next" value={next} />
        <TextField
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={LIMITS.email}
          placeholder="name@example.com"
          defaultValue={state.values?.email}
          error={state.errors?.email}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          error={state.errors?.password}
        />
        <Link
          href="/forgot-password"
          className="text-text-muted hover:text-text -mt-2 self-start text-sm underline underline-offset-4"
        >
          Forgot your password?
        </Link>
      </FormFrame>
      <p className="text-text-muted text-sm">
        New here?{" "}
        <Link href="/signup" className="text-text underline underline-offset-4">
          Create a free account
        </Link>
      </p>
    </div>
  );
}

export function SignUpForm({ google }: { google: boolean }) {
  const consentId = useId();
  const [state, action, pending] = useActionState(signUpAction, IDLE);
  return (
    <div className="flex flex-col gap-6">
      {google && state.status !== "success" ? (
        <>
          <GoogleButton label="Sign up with Google" />
          <p className="text-text-muted -mt-3 text-sm leading-relaxed">
            By continuing with Google you confirm you are {LEGAL.minimumAge} or older and accept the{" "}
            {legal}.
          </p>
          <Divider />
        </>
      ) : null}
      <FormFrame
        state={state}
        action={action}
        pending={pending}
        submitLabel="Create account"
        note={
          <>
            We store your email address and a scrambled (hashed) copy of your password, nothing
            else. You can delete your account at any time.
          </>
        }
      >
        <TextField
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={LIMITS.email}
          placeholder="name@example.com"
          defaultValue={state.values?.email}
          error={state.errors?.email}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD.minLength}
          help={`At least ${PASSWORD.minLength} characters. A short sentence is easy to remember and hard to guess.`}
          error={state.errors?.password}
        />
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <input
              id={consentId}
              type="checkbox"
              name="consent"
              required
              aria-invalid={state.errors?.consent ? true : undefined}
              aria-describedby={state.errors?.consent ? `${consentId}-error` : undefined}
              className="mt-1 size-4 shrink-0 accent-(--text)"
            />
            <label htmlFor={consentId} className="text-sm leading-relaxed">
              I am {LEGAL.minimumAge} or older and I accept the {legal}.
            </label>
          </div>
          {state.errors?.consent ? (
            <p id={`${consentId}-error`} className="text-danger text-sm">
              {state.errors.consent}
            </p>
          ) : null}
        </div>
      </FormFrame>
      {state.status === "success" ? null : (
        <p className="text-text-muted text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-text underline underline-offset-4">
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestResetAction, IDLE);
  return (
    <FormFrame state={state} action={action} pending={pending} submitLabel="Send reset link">
      <TextField
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        maxLength={LIMITS.email}
        placeholder="name@example.com"
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
    </FormFrame>
  );
}

/** The page a reset email opens. Nothing changes until the form is sent. */
export function ResetPasswordForm() {
  const token = useSyncExternalStore(subscribeNever, readToken, empty);
  const [state, action, pending] = useActionState(resetPasswordAction, IDLE);
  useRedirectOnSuccess(state);
  if (state.status === "success") {
    return (
      <p role="status" className="text-lg">
        {state.message}
      </p>
    );
  }
  return (
    <FormFrame state={state} action={action} pending={pending} submitLabel="Change password">
      <input type="hidden" name="token" value={token} />
      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD.minLength}
        help={`At least ${PASSWORD.minLength} characters.`}
        error={state.errors?.password}
      />
      <TextField
        label="New password again"
        name="confirm"
        type="password"
        autoComplete="new-password"
        error={state.errors?.confirm}
      />
    </FormFrame>
  );
}

/**
 * The page the sign-up email opens. The account is created when the button
 * is pressed, not when the link is opened, so mail scanners cannot do it.
 */
export function VerifyEmailForm() {
  const token = useSyncExternalStore(subscribeNever, readToken, empty);
  const [state, action, pending] = useActionState(verifyEmailAction, IDLE);
  useRedirectOnSuccess(state);

  if (state.status !== "idle") {
    return (
      <div className="flex flex-col items-start gap-5">
        <p
          role={state.status === "success" ? "status" : "alert"}
          className={state.status === "success" ? "text-lg" : "text-danger text-lg"}
        >
          {state.message}
        </p>
        {state.status === "error" ? (
          <Link href="/login" className={button("outline")}>
            Sign in
          </Link>
        ) : null}
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col items-start gap-5">
      <input type="hidden" name="token" value={token} />
      <button type="submit" disabled={pending || token === ""} className={button("solid")}>
        {pending ? "Working" : "Confirm my email"}
      </button>
    </form>
  );
}

/**
 * Where Google sends the browser back. The ID token arrives in the URL
 * fragment, which browsers never send to any server; it is removed from the
 * address bar at once and handed to the server action that verifies it.
 */
export function GoogleCallback() {
  const [message, setMessage] = useState<string | null>(null);
  // The state cookie works once: development's double-run of effects must not spend it twice.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    history.replaceState(null, "", window.location.pathname);
    const idToken = params.get("id_token");
    const state = params.get("state");
    const failed = "Signing in with Google did not complete. Please try again.";
    if (!idToken || !state) {
      const denied = params.get("error") === "access_denied";
      // Deferred so the message is not set synchronously inside the effect.
      queueMicrotask(() => setMessage(denied ? "Google sign-in was cancelled." : failed));
      return;
    }
    googleSignInAction({ idToken, state }).then(
      (result) => {
        if (result.ok && result.redirectTo) window.location.replace(safeNext(result.redirectTo));
        else setMessage(result.message ?? failed);
      },
      () => setMessage(failed),
    );
  }, []);

  if (!message) {
    return (
      <p role="status" aria-busy="true" className="text-text-muted text-lg">
        Signing you in with Google.
      </p>
    );
  }
  return (
    <div className="flex flex-col items-start gap-5">
      <p role="alert" className="text-danger text-lg">
        {message}
      </p>
      <Link href="/login" className={button("outline")}>
        Back to sign in
      </Link>
    </div>
  );
}
