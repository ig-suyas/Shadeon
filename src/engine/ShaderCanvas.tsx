"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { loadFragment } from "@/shaders/loaders";
import { posterBackground } from "@/shaders/poster";
import type { ShaderMeta } from "@/shaders/schema";
import { resolveSettings } from "@/shaders/settings";
import { StudioSurface } from "@/studio/StudioSurface";
import { acquireDedicated, loseContext } from "./context-budget";
import { getDeviceProfile } from "./device";
import { mountShader } from "./runtime";
import { addSlot, configureShared } from "./shared-context";

export type ShaderStatus = "poster" | "live" | "unsupported";

export interface ShaderCanvasProps {
  shader: ShaderMeta;
  /** Overrides for the shader's defaults. Validated against its controls. */
  settings?: Record<string, unknown>;
  /**
   * "shared" (default) draws through the single gallery WebGL context: use it
   * for cards and anything that appears many times. "dedicated" owns a context
   * and reacts to the pointer: use it for one large surface at a time.
   */
  mode?: "shared" | "dedicated";
  paused?: boolean;
  /** CSS background shown until the shader is live. Defaults to a gradient of its colours. */
  poster?: string;
  className?: string;
  style?: CSSProperties;
  onStatusChange?: (status: ShaderStatus) => void;
}

interface Handle {
  set(settings: Record<string, number | boolean | string[]>): void;
  pause(): void;
  play(): void;
  destroy(): void;
}

/**
 * Live shader surface. Paints a CSS poster immediately, loads the shader's
 * code when it nears the viewport, then fades the canvas in over the poster.
 * If WebGL is missing or the shader fails, the poster simply stays.
 */
export function ShaderCanvas({ mode = "shared", ...props }: ShaderCanvasProps) {
  // A new key gives a fresh canvas element: a canvas is tied to one context type.
  if (props.shader.engine === "studio") {
    return <StudioSurface key={`${props.shader.id}:${mode}`} mode={mode} {...props} />;
  }
  return <ShaderSurface key={`${props.shader.id}:${mode}`} mode={mode} {...props} />;
}

function ShaderSurface({
  shader,
  settings,
  mode,
  paused = false,
  poster,
  className,
  style,
  onStatusChange,
}: ShaderCanvasProps & { mode: "shared" | "dedicated" }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<Handle | null>(null);
  const [status, setStatus] = useState<ShaderStatus>("poster");
  const resolved = useMemo(() => resolveSettings(shader, settings), [shader, settings]);
  const latest = useRef({ settings: resolved, paused, onStatusChange });

  // Declared before the mount effect so it always sees current values.
  useEffect(() => {
    latest.current = { settings: resolved, paused, onStatusChange };
    handleRef.current?.set(resolved);
    if (paused) handleRef.current?.pause();
    else handleRef.current?.play();
  }, [resolved, paused, onStatusChange]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    let cancelled = false;
    let handle: Handle | null = null;
    let release: (() => void) | null = null;

    const report = (next: ShaderStatus): void => {
      if (cancelled) return;
      setStatus(next);
      latest.current.onStatusChange?.(next);
    };

    const stop = (): void => {
      handle?.destroy();
      release?.();
      if (handle && mode === "dedicated") loseContext(canvas);
      handle = null;
      release = null;
      handleRef.current = null;
    };

    const start = async (): Promise<void> => {
      try {
        const fragment = await loadFragment(shader.id);
        if (cancelled) return;
        const profile = getDeviceProfile();
        const options = {
          settings: latest.current.settings,
          stillTime: shader.stillTime,
          onReady: () => report("live"),
          onError: () => report("unsupported"),
        };
        if (mode === "shared") {
          configureShared({
            dpr: profile.cardDpr,
            fps: profile.cardFps,
            maxActive: profile.maxActiveCards,
          });
          handle = addSlot(canvas, { fragment, ...options });
        } else {
          release = acquireDedicated(() => {
            stop();
            report("poster");
          });
          handle = mountShader(canvas, fragment, { ...options, maxDpr: profile.surfaceDpr });
        }
        if (latest.current.paused) handle.pause();
        handleRef.current = handle;
      } catch {
        report("unsupported");
      }
    };

    const nearViewport = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        nearViewport.disconnect();
        void start();
      },
      { rootMargin: "200px" },
    );
    nearViewport.observe(host);

    return () => {
      cancelled = true;
      nearViewport.disconnect();
      stop();
    };
  }, [shader.id, shader.stillTime, mode]);

  return (
    <div
      ref={hostRef}
      className={className}
      data-shader={shader.id}
      data-status={status}
      style={{
        position: "relative",
        overflow: "hidden",
        background: poster ?? posterBackground(resolved.colors),
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "block",
          width: "100%",
          height: "100%",
          opacity: status === "live" ? 1 : 0,
          transition: "opacity 500ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}
