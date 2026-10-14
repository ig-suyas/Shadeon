"use client";

import { LockSimpleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import type { ExportResult } from "@/export/generate";
import { EXPORT_TARGETS, TARGET_LABELS, type ExportTarget } from "@/export/targets";
import { cn } from "@/lib/cn";
import {
  fetchCode,
  loginHere,
  SignInRequired,
  useSession,
  type CodeResponse,
} from "@/lib/session-client";
import type { ShaderMeta } from "@/shaders/schema";

interface CodePanelProps {
  shader: ShaderMeta;
  /** Current settings. The code always reflects exactly these. */
  settings?: Record<string, unknown>;
  target: ExportTarget;
  onTargetChange: (target: ExportTarget) => void;
  className?: string;
}

type CodeState = CodeResponse | "error" | "signed-out" | null;

/**
 * Asks the server for all three outputs for a shader + settings. The code is
 * generated there, for signed-in visitors only; nothing is requested while
 * the visitor is known to be signed out.
 */
function useExports(shader: ShaderMeta, settingsKey: string, enabled: boolean): CodeState {
  const [state, setState] = useState<{ key: string; value: CodeState } | null>(null);
  const key = `${shader.id}|${settingsKey}`;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const settings = settingsKey ? (JSON.parse(settingsKey) as Record<string, unknown>) : undefined;
    fetchCode(shader.id, settings).then(
      (value) => {
        if (!cancelled) setState({ key, value });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ key, value: error instanceof SignInRequired ? "signed-out" : "error" });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [shader.id, settingsKey, key, enabled]);

  return state?.key === key ? state.value : null;
}

/** Shown in place of the code to visitors who are not signed in. */
function SignInPrompt() {
  // Read on click, so the link returns to the page as it is then (with its settings).
  const [href, setHref] = useState("/login");
  const remember = (): void => setHref(loginHere());
  return (
    <div className="flex h-full min-h-56 flex-col items-start justify-center gap-4 p-6 font-sans">
      <LockSimpleIcon size={22} aria-hidden="true" className="text-text-muted" />
      <div className="flex flex-col gap-1.5">
        <p className="text-text text-base font-medium">Sign in to get the code</p>
        <p className="text-text-muted max-w-[46ch] text-sm leading-relaxed">
          Every shader is free to explore and tune. A free account unlocks the React, JavaScript and
          GLSL code, ready to paste.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={href}
          onPointerDown={remember}
          onFocus={remember}
          onClick={remember}
          className={button("solid", "sm")}
          data-testid="code-sign-in"
        >
          Sign in
        </Link>
        <Link href="/signup" className={button("outline", "sm")}>
          Create a free account
        </Link>
      </div>
    </div>
  );
}

/** True once the element has come within about a screen of the viewport. Stays true. */
function useNearViewport(ref: RefObject<HTMLElement | null>): boolean {
  // Without IntersectionObserver there is no way to wait, so start at once.
  const [near, setNear] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const element = ref.current;
    if (near || !element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, near]);

  return near;
}

/**
 * Highlights code in a worker, and only once the panel is close to being
 * seen, so a shader page does not spend its first seconds on code below the
 * fold. Until the highlighted HTML is ready the caller shows plain text.
 */
function useHighlighted(result: ExportResult | null, enabled: boolean): string | null {
  const [state, setState] = useState<{ code: string; html: string } | null>(null);

  useEffect(() => {
    if (!result || !enabled) return;
    let cancelled = false;
    void import("@/lib/highlight-client")
      .then(({ highlightOffThread }) => highlightOffThread(result.code, result.language))
      .then((html) => {
        if (!cancelled) setState({ code: result.code, html });
      })
      .catch(() => {
        // Plain text stays; highlighting is an enhancement.
      });
    return () => {
      cancelled = true;
    };
  }, [result, enabled]);

  return result && state?.code === result.code ? state.html : null;
}

/**
 * Code for one shader: React TS, JavaScript and GLSL tabs, syntax highlighting,
 * one-click copy with confirmation, and the install command.
 */
export function CodePanel({ shader, settings, target, onTargetChange, className }: CodePanelProps) {
  const id = useId();
  const tabs = useRef<Map<ExportTarget, HTMLButtonElement>>(new Map());
  const root = useRef<HTMLDivElement>(null);
  const near = useNearViewport(root);
  const session = useSession();
  const signedOut = session.status === "signed-out";
  const fetched = useExports(
    shader,
    settings ? JSON.stringify(settings) : "",
    session.status === "signed-in",
  );
  const exports = signedOut ? "signed-out" : fetched;
  const code = exports && typeof exports === "object" ? exports : null;
  const result = code ? code.exports[target] : null;
  const html = useHighlighted(result, near);
  const install = code?.install ?? null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const index = EXPORT_TARGETS.indexOf(target);
    const last = EXPORT_TARGETS.length - 1;
    let next = index;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;
    event.preventDefault();
    event.stopPropagation();
    const nextTarget = EXPORT_TARGETS[next];
    if (!nextTarget) return;
    onTargetChange(nextTarget);
    tabs.current.get(nextTarget)?.focus();
  };

  return (
    <div
      ref={root}
      className={cn("flex min-h-0 min-w-0 flex-col", className)}
      data-testid="code-panel"
    >
      <div className="border-line flex items-center justify-between gap-3 border-b px-3 py-2.5">
        <div
          role="tablist"
          aria-label="Code format"
          onKeyDown={onKeyDown}
          className="scroll-quiet flex min-w-0 gap-1 overflow-x-auto"
        >
          {EXPORT_TARGETS.map((item) => (
            <button
              key={item}
              ref={(element) => {
                if (element) tabs.current.set(item, element);
                else tabs.current.delete(item);
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${item}`}
              aria-selected={item === target}
              aria-controls={`${id}-panel`}
              tabIndex={item === target ? 0 : -1}
              onClick={() => onTargetChange(item)}
              className="text-text-muted hover:text-text aria-selected:bg-bg-sunken aria-selected:text-text rounded-control shrink-0 px-3 py-1.5 text-sm font-medium transition-colors duration-150"
            >
              {TARGET_LABELS[item]}
            </button>
          ))}
        </div>
        {exports === "signed-out" ? null : (
          <CopyButton
            text={() => {
              if (!result) throw new Error("Code is not ready");
              return result.code;
            }}
            label="Copy code"
            compact
            variant="solid"
            size="sm"
          />
        )}
      </div>

      {target === "react" && install ? (
        <div className="border-line flex items-center gap-2 border-b py-2 pr-2 pl-4">
          <code className="text-text-muted scroll-quiet min-w-0 flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap">
            {install}
          </code>
          <CopyButton
            text={install}
            label="Copy install command"
            ariaLabel="Copy install command"
            iconOnly
            variant="quiet"
            size="sm"
          />
        </div>
      ) : null}

      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${target}`}
        tabIndex={0}
        className="bg-bg-sunken code-surface min-h-0 flex-1 overflow-auto font-mono text-[13px] leading-relaxed"
      >
        {exports === "signed-out" ? (
          <SignInPrompt />
        ) : exports === "error" ? (
          <p className="text-danger p-4 font-sans text-sm">
            The code could not be generated. Check your connection and reopen this panel.
          </p>
        ) : !result ? (
          <div aria-busy="true" className="flex flex-col gap-2.5 p-4">
            <span className="sr-only">Generating code</span>
            {[72, 44, 58, 30, 66, 52, 38, 61].map((width, index) => (
              <span key={index} className="bg-line h-3 rounded-sm" style={{ width: `${width}%` }} />
            ))}
          </div>
        ) : html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre>
            <code>{result.code}</code>
          </pre>
        )}
      </div>

      {result ? (
        <p className="border-line text-text-faint border-t px-4 py-2 font-mono text-xs">
          {result.filename}, {result.code.split("\n").length.toLocaleString("en-US")} lines
        </p>
      ) : null}
    </div>
  );
}
