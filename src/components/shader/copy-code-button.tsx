"use client";

import { CheckIcon, CopyIcon, WarningIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { button } from "@/components/ui/button";
import type { ExportTarget } from "@/export/generate";
import { loadFragment } from "@/shaders/loaders";
import type { ShaderMeta } from "@/shaders/schema";

interface CopyCodeButtonProps {
  shader: ShaderMeta;
  settings?: Record<string, unknown>;
  /** CSS custom properties to read the colours from at click time (for theme-driven shaders). */
  colorVars?: readonly string[];
  target?: ExportTarget;
  label: string;
  variant?: "solid" | "outline" | "glass";
  size?: "md" | "sm";
  className?: string;
}

type State = "idle" | "copied" | "error";

/** The generator and the shader source load on demand, so pages that only show the button stay light. */
async function buildCode(
  shader: ShaderMeta,
  settings: Record<string, unknown> | undefined,
  target: ExportTarget,
): Promise<string> {
  const [{ generateExport }, fragment] = await Promise.all([
    import("@/export/generate"),
    loadFragment(shader.id),
  ]);
  return generateExport({ meta: shader, fragment, settings }, target).code;
}

/** Copies a shader's production code for the given settings, with visible and spoken confirmation. */
export function CopyCodeButton({
  shader,
  settings,
  colorVars,
  target = "react",
  label,
  variant = "outline",
  size = "md",
  className,
}: CopyCodeButtonProps) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const warm = useCallback(() => {
    void import("@/export/generate");
    void loadFragment(shader.id).catch(() => {});
  }, [shader.id]);

  const copy = async (): Promise<void> => {
    let next: State = "copied";
    try {
      let current = settings;
      if (colorVars) {
        const computed = getComputedStyle(document.documentElement);
        const colors = colorVars.map((name) => computed.getPropertyValue(name).trim());
        current = { ...settings, colors };
      }
      await navigator.clipboard.writeText(await buildCode(shader, current, target));
    } catch {
      next = "error";
    }
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2400);
  };

  const message =
    state === "copied" ? "Copied to clipboard" : state === "error" ? "Could not copy" : label;
  const Icon = state === "copied" ? CheckIcon : state === "error" ? WarningIcon : CopyIcon;

  return (
    <button
      type="button"
      onClick={() => void copy()}
      onPointerEnter={warm}
      onFocus={warm}
      className={button(variant, size, className)}
    >
      <Icon
        size={size === "sm" ? 16 : 18}
        aria-hidden="true"
        className={state === "copied" ? "text-accent" : state === "error" ? "text-danger" : ""}
      />
      {/* Both labels share one grid cell so the button never changes width. */}
      <span className="grid text-left">
        <span className={`col-start-1 row-start-1 ${state === "idle" ? "" : "invisible"}`}>
          {label}
        </span>
        <span
          aria-hidden="true"
          className={`col-start-1 row-start-1 ${state === "idle" ? "invisible" : ""}`}
        >
          {state === "error" ? "Copy failed" : "Copied"}
        </span>
      </span>
      <span role="status" className="sr-only">
        {state === "idle" ? "" : message}
      </span>
    </button>
  );
}
