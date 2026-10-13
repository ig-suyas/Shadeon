"use client";

import { CaretLeftIcon, CaretRightIcon, CodeIcon, XIcon } from "@phosphor-icons/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { CodePanel } from "@/components/code/code-panel";
import { button } from "@/components/ui/button";
import { ShaderCanvas } from "@/engine/ShaderCanvas";
import type { ExportTarget } from "@/export/targets";
import { cn } from "@/lib/cn";
import type { ShaderMeta } from "@/shaders/schema";
import { applyPreset } from "@/shaders/settings";

interface ShaderViewerProps {
  shader: ShaderMeta;
  /** Open code tab, or null when the code panel is closed. */
  code: ExportTarget | null;
  /** Finds the card this view grew out of, for the open and close animation. */
  getOrigin: (id: string) => Element | null;
  onClose: () => void;
  onCodeChange: (code: ExportTarget | null) => void;
  /** Go to the previous (-1) or next (1) shader. Undefined when there is none. */
  onStep?: (direction: -1 | 1) => void;
}

const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 0.6; // px per ms

function reducedMotion(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The transform that makes `to` occupy the box of `from` (transform-origin: 0 0). */
function flip(from: DOMRect, to: DOMRect): string {
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
}

function onScreen(rect: DOMRect): boolean {
  return rect.bottom > 0 && rect.top < innerHeight && rect.width > 0;
}

/**
 * A shader at near full-screen size, grown out of its gallery card. A native
 * modal <dialog> provides the focus trap, Escape handling and an inert page
 * behind. Closes with Escape, the close button, a click outside, or a
 * downward swipe on touch screens.
 */
export function ShaderViewer({
  shader,
  code,
  getOrigin,
  onClose,
  onCodeChange,
  onStep,
}: ShaderViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const codeButtonRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const drag = useRef<{
    id: number;
    startY: number;
    lastY: number;
    lastTime: number;
    speed: number;
  } | null>(null);
  const [presets, setPresets] = useState<Record<string, string>>({});
  const presetId = presets[shader.id] ?? shader.presets[0]?.id ?? "";
  const settings = useMemo(() => applyPreset(shader, presetId), [shader, presetId]);

  // Open: show the modal, then grow the sheet out of the card it came from.
  useEffect(() => {
    const dialog = dialogRef.current;
    const sheet = sheetRef.current;
    if (!dialog || !sheet) return;
    if (!dialog.open) dialog.showModal();
    // showModal focuses the first control; the primary action is a better start.
    codeButtonRef.current?.focus({ preventScroll: true });
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    if (!reducedMotion()) {
      const origin = getOrigin(shader.id)?.getBoundingClientRect();
      const target = sheet.getBoundingClientRect();
      const from =
        origin && onScreen(origin)
          ? { transform: flip(origin, target), opacity: 1 }
          : { transform: "translateY(24px) scale(0.98)", opacity: 0 };
      sheet.animate([from, { transform: "none", opacity: 1 }], { duration: 420, easing: EASING });
      scrimRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 300,
        easing: "ease-out",
      });
      chromeRef.current?.animate([{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], {
        duration: 420,
        easing: "ease-out",
      });
    }
    return () => {
      root.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
    // Runs once per mount: stepping between shaders must not replay the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = useCallback(
    (direction: "origin" | "down" = "origin"): void => {
      if (closing.current) return;
      closing.current = true;
      const sheet = sheetRef.current;
      if (!sheet || reducedMotion()) {
        onClose();
        return;
      }
      const origin = getOrigin(shader.id)?.getBoundingClientRect();
      const current = sheet.getBoundingClientRect();
      const to =
        direction === "origin" && origin && onScreen(origin)
          ? { transform: flip(origin, current), opacity: 0.4 }
          : {
              transform: `translateY(${direction === "down" ? "60%" : "24px"}) scale(0.98)`,
              opacity: 0,
            };
      scrimRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 240,
        easing: "ease-in",
        fill: "forwards",
      });
      chromeRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 120,
        fill: "forwards",
      });
      const animation = sheet.animate(
        [{ transform: sheet.style.transform || "none", opacity: 1 }, to],
        {
          duration: 280,
          easing: EASING,
          fill: "forwards",
        },
      );
      animation.finished.then(onClose, onClose);
    },
    [getOrigin, onClose, shader.id],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    // Arrow keys belong to tabs, sliders and text when focus is inside them.
    const target = event.target as HTMLElement;
    if (target.closest('[role="tablist"], [role="tabpanel"], input, textarea, select')) return;
    if (!onStep) return;
    event.preventDefault();
    onStep(event.key === "ArrowLeft" ? -1 : 1);
  };

  // Swipe down to close, on touch only. Writes styles directly: no re-render per move.
  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType !== "touch" || (event.target as HTMLElement).closest("button, a")) return;
    drag.current = {
      id: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      speed: 0,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is a nicety; the gesture still works while the finger stays on the sheet.
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const state = drag.current;
    const sheet = sheetRef.current;
    if (!state || state.id !== event.pointerId || !sheet) return;
    const elapsed = event.timeStamp - state.lastTime;
    if (elapsed > 0) state.speed = (event.clientY - state.lastY) / elapsed;
    state.lastY = event.clientY;
    state.lastTime = event.timeStamp;
    const offset = Math.max(0, event.clientY - state.startY);
    sheet.style.transform = `translateY(${offset}px)`;
    if (scrimRef.current) scrimRef.current.style.opacity = String(Math.max(0.3, 1 - offset / 500));
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
    const state = drag.current;
    const sheet = sheetRef.current;
    if (!state || state.id !== event.pointerId || !sheet) return;
    drag.current = null;
    const offset = Math.max(0, event.clientY - state.startY);
    const cancelled = event.type === "pointercancel";
    if (!cancelled && (offset > SWIPE_DISTANCE || (offset > 24 && state.speed > SWIPE_VELOCITY))) {
      close("down");
      return;
    }
    const settle = sheet.animate(
      [{ transform: `translateY(${offset}px)` }, { transform: "none" }],
      {
        duration: reducedMotion() ? 0 : 220,
        easing: EASING,
      },
    );
    sheet.style.transform = "";
    if (scrimRef.current) scrimRef.current.style.opacity = "";
    void settle.finished.catch(() => {});
  };

  const swipe = {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={`${shader.name} shader`}
      data-testid="shader-viewer"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={onKeyDown}
      className="text-text fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden border-0 bg-transparent p-0 backdrop:bg-transparent"
    >
      <div
        ref={scrimRef}
        aria-hidden="true"
        onClick={() => close()}
        className="bg-bg/85 supports-[not(backdrop-filter:blur(1px))]:bg-bg/95 absolute inset-0 backdrop-blur-sm"
      />
      <div className="pointer-events-none relative flex size-full p-2 sm:p-4 lg:p-6">
        <div
          ref={sheetRef}
          className="border-line-strong bg-bg-raised rounded-card pointer-events-auto flex min-h-0 w-full origin-top-left flex-col overflow-hidden border will-change-transform"
        >
          <div ref={chromeRef} className="flex min-h-0 flex-1 flex-col">
            <header
              {...swipe}
              className="border-line flex touch-none items-center gap-2 border-b py-2 pr-2 pl-4"
            >
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-medium">{shader.name}</h2>
                <p className="text-text-faint truncate font-mono text-xs">{shader.category}</p>
              </div>
              {onStep ? (
                <div className="flex max-sm:hidden">
                  <button
                    type="button"
                    onClick={() => onStep(-1)}
                    aria-label="Previous shader"
                    className={button("quiet", "sm", "aspect-square px-0")}
                  >
                    <CaretLeftIcon size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onStep(1)}
                    aria-label="Next shader"
                    className={button("quiet", "sm", "aspect-square px-0")}
                  >
                    <CaretRightIcon size={18} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => onCodeChange(code ? null : "react")}
                aria-pressed={code !== null}
                data-testid="viewer-code"
                ref={codeButtonRef}
                className={button(code ? "outline" : "solid", "sm")}
              >
                <CodeIcon size={16} aria-hidden="true" />
                Code
              </button>
              <button
                type="button"
                onClick={() => close()}
                aria-label="Close"
                data-testid="viewer-close"
                className={button("outline", "sm", "aspect-square px-0")}
              >
                <XIcon size={18} aria-hidden="true" />
              </button>
            </header>

            <div
              className={cn(
                "grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)]",
                code
                  ? "grid-rows-[minmax(140px,32%)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,min(46%,640px))] lg:grid-rows-1"
                  : "grid-rows-1",
              )}
            >
              <div className="relative flex min-h-0 min-w-0 flex-col">
                <div {...swipe} className="relative min-h-0 flex-1 touch-none">
                  <ShaderCanvas
                    shader={shader}
                    settings={settings}
                    mode="dedicated"
                    className="inset-0"
                    style={{ position: "absolute" }}
                  />
                </div>
                <div
                  role="group"
                  aria-label="Preset"
                  className="border-line scroll-quiet flex gap-2 overflow-x-auto border-t p-3"
                >
                  {shader.presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={preset.id === presetId}
                      onClick={() =>
                        setPresets((current) => ({ ...current, [shader.id]: preset.id }))
                      }
                      className="border-line text-text-muted hover:text-text aria-pressed:border-text aria-pressed:text-text rounded-control shrink-0 border px-3 py-1.5 text-sm transition-colors duration-150"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
              {code ? (
                <CodePanel
                  shader={shader}
                  settings={settings}
                  target={code}
                  onTargetChange={onCodeChange}
                  className="border-line max-lg:border-t lg:border-l"
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
