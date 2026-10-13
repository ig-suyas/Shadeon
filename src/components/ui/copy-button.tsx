"use client";

import { CheckIcon, CopyIcon, WarningIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { button } from "@/components/ui/button";

interface CopyButtonProps {
  /** The text to copy, or a function that produces it when clicked. */
  text: string | (() => string | Promise<string>);
  label: string;
  /** Accessible name when the visible label is hidden (icon-only). */
  ariaLabel?: string;
  iconOnly?: boolean;
  /** Show only the icon on narrow screens; the label returns from the sm breakpoint up. */
  compact?: boolean;
  variant?: "solid" | "outline" | "glass" | "quiet";
  size?: "md" | "sm";
  className?: string;
  /** Called on hover and focus, to preload whatever `text` needs. */
  onWarm?: () => void;
}

type State = "idle" | "copied" | "error";

/** Copies text with a visible and a spoken confirmation, and a visible failure state. */
export function CopyButton({
  text,
  label,
  ariaLabel,
  iconOnly = false,
  compact = false,
  variant = "outline",
  size = "md",
  className,
  onWarm,
}: CopyButtonProps) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async (): Promise<void> => {
    let next: State = "copied";
    try {
      const value = typeof text === "function" ? await text() : text;
      await navigator.clipboard.writeText(value);
    } catch {
      next = "error";
    }
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2400);
  };

  const Icon = state === "copied" ? CheckIcon : state === "error" ? WarningIcon : CopyIcon;
  const feedback = state === "error" ? "Copy failed" : "Copied";

  return (
    <button
      type="button"
      onClick={() => void copy()}
      onPointerEnter={onWarm}
      onFocus={onWarm}
      aria-label={ariaLabel ?? (compact ? label : undefined)}
      data-state={state}
      className={button(
        variant,
        size,
        iconOnly ? `aspect-square px-0 ${className ?? ""}` : className,
      )}
    >
      <Icon
        size={size === "sm" ? 16 : 18}
        aria-hidden="true"
        className={state === "copied" ? "text-accent" : state === "error" ? "text-danger" : ""}
      />
      {iconOnly ? null : (
        // Both labels share one grid cell so the button never changes width.
        <span className={`grid text-left ${compact ? "max-sm:hidden" : ""}`}>
          <span className={`col-start-1 row-start-1 ${state === "idle" ? "" : "invisible"}`}>
            {label}
          </span>
          <span
            aria-hidden="true"
            className={`col-start-1 row-start-1 ${state === "idle" ? "invisible" : ""}`}
          >
            {feedback}
          </span>
        </span>
      )}
      <span role="status" className="sr-only">
        {state === "copied" ? "Copied to clipboard" : state === "error" ? "Could not copy" : ""}
      </span>
    </button>
  );
}
