"use client";

import Link from "next/link";
import { useActionState, useId, useSyncExternalStore } from "react";
import { button } from "@/components/ui/button";
import { IDLE, LIMITS, TOPIC_LABELS, TOPICS } from "@/lib/form-types";
import {
  confirmWaitlistAction,
  contactAction,
  joinWaitlistAction,
  leaveWaitlistAction,
  requestShaderAction,
} from "@/server/actions";
import { FormFrame, SelectField, TextAreaField, TextField } from "./form-parts";

const privacy = (
  <Link href="/legal/privacy" className="text-text underline underline-offset-4">
    Privacy policy
  </Link>
);

export function WaitlistForm() {
  const consentId = useId();
  const [state, action, pending] = useActionState(joinWaitlistAction, IDLE);
  return (
    <FormFrame
      state={state}
      action={action}
      pending={pending}
      submitLabel="Join the waitlist"
      note={
        <>
          We store only your email address, and only to send this one announcement. You confirm by
          email first and can remove yourself at any time. {privacy}.
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
            Email me once when Shadeon Pro is available.
          </label>
        </div>
        {state.errors?.consent ? (
          <p id={`${consentId}-error`} className="text-danger text-sm">
            {state.errors.consent}
          </p>
        ) : null}
      </div>
    </FormFrame>
  );
}

export function RequestForm() {
  const [state, action, pending] = useActionState(requestShaderAction, IDLE);
  return (
    <FormFrame
      state={state}
      action={action}
      pending={pending}
      submitLabel="Send request"
      note={
        <>
          Your email is only used to tell you when the shader is published. Leave it empty to stay
          anonymous. {privacy}.
        </>
      }
    >
      <TextField
        label="What should it be called?"
        name="title"
        maxLength={LIMITS.title}
        placeholder="Caustics"
        defaultValue={state.values?.title}
        error={state.errors?.title}
      />
      <TextAreaField
        label="Describe the look"
        name="details"
        help="Colours, movement, mood, and where you would use it."
        maxLength={LIMITS.details}
        defaultValue={state.values?.details}
        error={state.errors?.details}
      />
      <TextField
        label="Reference link"
        name="referenceUrl"
        optional
        type="url"
        inputMode="url"
        maxLength={LIMITS.url}
        placeholder="https://"
        help="A photo, video or site that shows the feeling you are after. We use it as inspiration only and never copy code."
        defaultValue={state.values?.referenceUrl}
        error={state.errors?.referenceUrl}
      />
      <TextField
        label="Email address"
        name="email"
        optional
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

export function ContactForm() {
  const [state, action, pending] = useActionState(contactAction, IDLE);
  return (
    <FormFrame
      state={state}
      action={action}
      pending={pending}
      submitLabel="Send message"
      note={<>Add your email only if you would like a reply. {privacy}.</>}
    >
      <SelectField
        label="Topic"
        name="topic"
        options={TOPICS.map((topic) => ({ value: topic, label: TOPIC_LABELS[topic] }))}
        defaultValue={state.values?.topic}
        error={state.errors?.topic}
      />
      <TextAreaField
        label="Message"
        name="message"
        maxLength={LIMITS.message}
        defaultValue={state.values?.message}
        error={state.errors?.message}
      />
      <TextField
        label="Email address"
        name="email"
        optional
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

const subscribeNever = (): (() => void) => () => {};
const readToken = (): string => new URLSearchParams(window.location.search).get("token") ?? "";
const noToken = (): string => "";

/**
 * Confirm or leave the waitlist. The link in the email only opens this page;
 * the change happens when the button is pressed, so automatic link scanners
 * in mail software cannot confirm or remove anyone.
 */
export function WaitlistTokenForm({ mode }: { mode: "confirm" | "leave" }) {
  const token = useSyncExternalStore(subscribeNever, readToken, noToken);
  const [state, action, pending] = useActionState(
    mode === "confirm" ? confirmWaitlistAction : leaveWaitlistAction,
    IDLE,
  );

  if (state.status !== "idle") {
    return (
      <div className="flex flex-col items-start gap-5">
        <p
          role={state.status === "success" ? "status" : "alert"}
          className={state.status === "success" ? "text-lg" : "text-danger text-lg"}
        >
          {state.message}
        </p>
        <Link href="/shaders" className={button("outline")}>
          Browse shaders
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col items-start gap-5">
      <input type="hidden" name="token" value={token} />
      <button type="submit" disabled={pending || token === ""} className={button("solid")}>
        {pending ? "Working" : mode === "confirm" ? "Confirm my email" : "Remove my address"}
      </button>
    </form>
  );
}
