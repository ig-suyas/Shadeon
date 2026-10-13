"use client";

import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import {
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { button } from "@/components/ui/button";
import type { FormState } from "@/lib/form-types";
import { cn } from "@/lib/cn";

const control =
  "border-line-strong bg-bg placeholder:text-text-faint hover:border-text-faint rounded-control w-full border px-3 text-[15px] transition-colors duration-150 " +
  "aria-invalid:border-danger";

interface FieldBase {
  label: string;
  name: string;
  /** Shown under the label. */
  help?: string;
  error?: string;
  optional?: boolean;
}

function FieldFrame({
  id,
  label,
  help,
  error,
  optional,
  children,
}: FieldBase & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional ? <span className="text-text-faint font-normal"> (optional)</span> : null}
      </label>
      {help ? (
        <p id={`${id}-help`} className="text-text-muted -mt-1 text-sm leading-relaxed">
          {help}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-danger flex items-start gap-1.5 text-sm">
          <WarningCircleIcon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, help?: string, error?: string): string | undefined {
  return (
    [help ? `${id}-help` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined
  );
}

export function TextField({
  label,
  name,
  help,
  error,
  optional,
  ...input
}: FieldBase & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "id">) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} name={name} help={help} error={error} optional={optional}>
      <input
        id={id}
        name={name}
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        {...input}
        className={cn(control, "h-11")}
      />
    </FieldFrame>
  );
}

export function TextAreaField({
  label,
  name,
  help,
  error,
  optional,
  ...input
}: FieldBase & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "id">) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} name={name} help={help} error={error} optional={optional}>
      <textarea
        id={id}
        name={name}
        required={!optional}
        rows={6}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        {...input}
        className={cn(control, "min-h-32 resize-y py-2.5 leading-relaxed")}
      />
    </FieldFrame>
  );
}

export function SelectField({
  label,
  name,
  help,
  error,
  options,
  defaultValue,
}: FieldBase & { options: { value: string; label: string }[]; defaultValue?: string }) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} name={name} help={help} error={error}>
      <select
        id={id}
        name={name}
        required
        defaultValue={defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        className={cn(control, "h-11")}
      >
        <option value="" disabled>
          Choose one
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (element: HTMLElement, options: { sitekey: string; theme: "auto" }) => string;
  remove: (id: string) => void;
}

/** Cloudflare Turnstile, only when a site key is configured. It adds its own hidden field to the form. */
function Turnstile() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!TURNSTILE_SITE_KEY || !element) return;
    const sitekey = TURNSTILE_SITE_KEY;
    let widget: string | null = null;
    let cancelled = false;
    const api = (): TurnstileApi | undefined =>
      (window as unknown as { turnstile?: TurnstileApi }).turnstile;
    const mount = (): void => {
      const turnstile = api();
      if (cancelled || !turnstile) return;
      widget = turnstile.render(element, { sitekey, theme: "auto" });
    };
    if (api()) {
      mount();
    } else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = TURNSTILE_SCRIPT;
        script.async = true;
        document.head.append(script);
      }
      script.addEventListener("load", mount, { once: true });
    }
    return () => {
      cancelled = true;
      if (widget) api()?.remove(widget);
    };
  }, []);

  return TURNSTILE_SITE_KEY ? <div ref={ref} className="min-h-[65px]" /> : null;
}

interface FormFrameProps {
  state: FormState;
  action: (form: FormData) => void;
  pending: boolean;
  submitLabel: string;
  /** Short privacy note shown above the button. */
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * The shell every form shares: spam traps, the human check, a status line for
 * errors, a pending state on the button, and a success message that replaces
 * the form and takes focus.
 */
export function FormFrame({
  state,
  action,
  pending,
  submitLabel,
  note,
  children,
  className,
}: FormFrameProps) {
  const startedAt = useRef<number | null>(null);
  const elapsed = useRef<HTMLInputElement>(null);
  const result = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "idle") result.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div
        ref={result}
        tabIndex={-1}
        role="status"
        className={cn(
          "border-line bg-bg-raised rounded-card flex items-start gap-3 border p-5 outline-none",
          className,
        )}
      >
        <CheckCircleIcon size={22} aria-hidden="true" className="text-accent mt-0.5 shrink-0" />
        <p className="leading-relaxed">{state.message}</p>
      </div>
    );
  }

  const onSubmit = (): void => {
    if (elapsed.current && startedAt.current !== null) {
      elapsed.current.value = String(Date.now() - startedAt.current);
    }
  };

  return (
    <form
      action={action}
      onSubmit={onSubmit}
      onFocusCapture={() => {
        startedAt.current ??= Date.now();
      }}
      className={cn("flex flex-col gap-5", className)}
    >
      {state.status === "error" && state.message ? (
        <div
          ref={result}
          tabIndex={-1}
          role="alert"
          className="border-danger text-danger rounded-control flex items-start gap-2 border px-3 py-2.5 text-sm outline-none"
        >
          <WarningCircleIcon size={18} aria-hidden="true" className="mt-px shrink-0" />
          {state.message}
        </div>
      ) : null}

      {children}

      {/* Hidden from people and assistive technology; only automated fillers complete it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <input ref={elapsed} type="hidden" name="elapsed" defaultValue="" />
      <Turnstile />

      {note ? <p className="text-text-muted text-sm leading-relaxed">{note}</p> : null}
      <button type="submit" disabled={pending} className={button("solid", "md", "self-start")}>
        {pending ? "Sending" : submitLabel}
      </button>
    </form>
  );
}
