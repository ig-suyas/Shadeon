"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useTransition } from "react";
import { FormFrame, TextField } from "@/components/forms/form-parts";
import { button } from "@/components/ui/button";
import { PASSWORD } from "@/lib/auth-types";
import { IDLE, type FormState } from "@/lib/form-types";
import { markSignedOut } from "@/lib/session-client";
import {
  changePasswordAction,
  deleteAccountAction,
  signOutAction,
  signOutEverywhereAction,
} from "@/server/auth-actions";

interface AccountPanelProps {
  email: string;
  hasPassword: boolean;
  hasGoogle: boolean;
}

/** Sends the browser to sign-in when an action says the session has ended. */
function useSessionEnded(state: FormState): void {
  useEffect(() => {
    if (state.status === "error" && state.redirectTo) window.location.assign(state.redirectTo);
  }, [state]);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-line flex flex-col gap-4 border-t pt-8">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function AccountPanel({ email, hasPassword, hasGoogle }: AccountPanelProps) {
  const [leaving, startLeaving] = useTransition();
  const [password, passwordAction, passwordPending] = useActionState(changePasswordAction, IDLE);
  const [deletion, deleteAction, deletePending] = useActionState(deleteAccountAction, IDLE);
  const router = useRouter();
  useSessionEnded(password);
  useSessionEnded(deletion);

  const leave = (everywhere: boolean): void => {
    startLeaving(async () => {
      await (everywhere ? signOutEverywhereAction() : signOutAction());
      markSignedOut();
      router.push("/");
    });
  };

  const methods = [hasPassword ? "password" : null, hasGoogle ? "Google" : null].filter(Boolean);

  return (
    <div className="flex flex-col gap-10">
      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-[auto_1fr]">
        <dt className="text-text-muted">Email</dt>
        <dd className="font-medium break-all" data-testid="account-email">
          {email}
        </dd>
        <dt className="text-text-muted">Signs in with</dt>
        <dd>{methods.join(" and ")}</dd>
      </dl>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={leaving}
          onClick={() => leave(false)}
          className={button("solid")}
        >
          Sign out
        </button>
        <button
          type="button"
          disabled={leaving}
          onClick={() => leave(true)}
          className={button("outline")}
        >
          Sign out on every device
        </button>
      </div>

      <Section title={hasPassword ? "Change password" : "Add a password"}>
        <p className="text-text-muted max-w-[60ch] text-sm leading-relaxed">
          {hasPassword
            ? "Changing your password signs you out on every other device."
            : "Add a password to sign in with your email address as well as Google. For your safety this works within 15 minutes of signing in with Google."}
        </p>
        <FormFrame
          state={password}
          action={passwordAction}
          pending={passwordPending}
          submitLabel={hasPassword ? "Change password" : "Add password"}
        >
          {hasPassword ? (
            <TextField
              label="Current password"
              name="current"
              type="password"
              autoComplete="current-password"
              error={password.errors?.current}
            />
          ) : (
            <input type="hidden" name="current" value="" />
          )}
          <TextField
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD.minLength}
            help={`At least ${PASSWORD.minLength} characters.`}
            error={password.errors?.password}
          />
          <TextField
            label="New password again"
            name="confirm"
            type="password"
            autoComplete="new-password"
            error={password.errors?.confirm}
          />
        </FormFrame>
      </Section>

      <Section title="Delete account">
        <p className="text-text-muted max-w-[60ch] text-sm leading-relaxed">
          This deletes your account, your sign-in sessions and any unused email links, at once and
          for good. It cannot be undone. Code you have already copied stays yours under the MIT
          License. If you are on the Pro waitlist, that is separate: use the link in its emails to
          leave it.
        </p>
        <FormFrame
          state={deletion}
          action={deleteAction}
          pending={deletePending}
          submitLabel="Delete my account"
        >
          {hasPassword ? (
            <TextField
              label="Your password"
              name="password"
              type="password"
              autoComplete="current-password"
              error={deletion.errors?.password}
            />
          ) : null}
          <TextField
            label='Type "delete" to confirm'
            name="confirm"
            autoComplete="off"
            error={deletion.errors?.confirm}
          />
        </FormFrame>
      </Section>
    </div>
  );
}
