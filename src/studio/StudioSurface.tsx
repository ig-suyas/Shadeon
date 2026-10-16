"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { acquireDedicated } from "@/engine/context-budget";
import { getDeviceProfile } from "@/engine/device";
import { useTheme } from "@/lib/use-theme";
import { loadMaterial } from "@/shaders/loaders";
import { posterBackground } from "@/shaders/poster";
import type { ShaderMeta } from "@/shaders/schema";
import { resolveSettings } from "@/shaders/settings";
import { mountStudio, type StudioHandle, type StudioParams } from "./core";
import { effectiveColors, studioRanges } from "./palette";
import { requestStill } from "./stills";

export type StudioStatus = "poster" | "live" | "unsupported";

export interface StudioSurfaceProps {
  shader: ShaderMeta;
  settings?: Record<string, unknown>;
  /** "dedicated": live and interactive. "shared": a still frame (gallery cards). */
  mode: "shared" | "dedicated";
  paused?: boolean;
  poster?: string;
  className?: string;
  style?: CSSProperties;
  onStatusChange?: (status: StudioStatus) => void;
}

function paramsOf(settings: ReturnType<typeof resolveSettings>): StudioParams {
  const params: StudioParams = {};
  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === "number" || typeof value === "boolean") params[key] = value;
  }
  return params;
}

/**
 * A studio (multi-pass WebGL2) shader. Dedicated surfaces own a context and
 * follow the pointer; shared ones (cards) show a still frame rendered once on
 * a short-lived context. The CSS poster stays when WebGL2 is missing.
 */
export function StudioSurface({
  shader,
  settings,
  mode,
  paused = false,
  poster,
  className,
  style,
  onStatusChange,
}: StudioSurfaceProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<StudioHandle | null>(null);
  const [status, setStatus] = useState<StudioStatus>("poster");
  const theme = useTheme();
  const resolved = useMemo(() => resolveSettings(shader, settings), [shader, settings]);
  const colors = useMemo(
    () => effectiveColors(shader, resolved.colors, theme),
    [shader, resolved.colors, theme],
  );
  const params = useMemo(() => paramsOf(resolved), [resolved]);
  const latest = useRef({ params, colors, theme, paused, onStatusChange });

  useEffect(() => {
    latest.current = { params, colors, theme, paused, onStatusChange };
    handleRef.current?.set(params);
    handleRef.current?.setColors(colors, theme === "light");
    if (paused) handleRef.current?.pause();
    else handleRef.current?.play();
  }, [params, colors, theme, paused, onStatusChange]);

  // Live, interactive surface.
  useEffect(() => {
    if (mode !== "dedicated") return;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    let cancelled = false;
    let handle: StudioHandle | null = null;
    let release: (() => void) | null = null;

    const report = (next: StudioStatus): void => {
      if (cancelled) return;
      setStatus(next);
      latest.current.onStatusChange?.(next);
    };
    const stop = (): void => {
      handle?.destroy();
      release?.();
      handle = null;
      release = null;
      handleRef.current = null;
    };

    const start = async (): Promise<void> => {
      try {
        const material = await loadMaterial(shader.id);
        if (cancelled) return;
        const profile = getDeviceProfile();
        release = acquireDedicated(() => {
          stop();
          report("poster");
        });
        const now = latest.current;
        handle = mountStudio(canvas, material, {
          params: now.params,
          ranges: studioRanges(shader),
          colors: now.colors,
          light: now.theme === "light",
          maxDpr: profile.surfaceDpr,
          lowPower: profile.lowPower,
          eventTarget: host,
          onReady: () => report("live"),
          onError: () => report("unsupported"),
        });
        if (now.paused) handle.pause();
        handleRef.current = handle;
      } catch {
        report("unsupported");
      }
    };

    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        near.disconnect();
        void start();
      },
      { rootMargin: "200px" },
    );
    near.observe(host);
    return () => {
      cancelled = true;
      near.disconnect();
      stop();
    };
  }, [shader, mode]);

  // Still frame for cards: re-rendered when the size, settings or theme change.
  const stillKey = mode === "shared" ? JSON.stringify([params, colors, theme]) : "";
  useEffect(() => {
    if (mode !== "shared") return;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastSize = "";

    const render = async (): Promise<void> => {
      const rect = host.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const size = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
      if (size === lastSize) return;
      lastSize = size;
      try {
        const material = await loadMaterial(shader.id);
        if (cancelled) return;
        const dpr = Math.min(typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 1.5);
        const now = latest.current;
        const ok = await requestStill({
          material,
          width: rect.width,
          height: rect.height,
          dpr,
          options: {
            params: now.params,
            ranges: studioRanges(shader),
            colors: now.colors,
            light: now.theme === "light",
            lowPower: getDeviceProfile().lowPower,
          },
          cancelled: () => cancelled,
          paint: (source) => {
            canvas.width = source.width;
            canvas.height = source.height;
            canvas.getContext("2d")?.drawImage(source, 0, 0);
          },
        });
        if (cancelled) return;
        setStatus(ok ? "live" : "unsupported");
        latest.current.onStatusChange?.(ok ? "live" : "unsupported");
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    };

    let seen = false;
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || seen) return;
        seen = true;
        void render();
      },
      { rootMargin: "300px" },
    );
    near.observe(host);
    const sizing = new ResizeObserver(() => {
      if (!seen) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void render(), 200);
    });
    sizing.observe(host);
    return () => {
      cancelled = true;
      near.disconnect();
      sizing.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [shader, mode, stillKey]);

  return (
    <div
      ref={hostRef}
      className={className}
      data-shader={shader.id}
      data-engine="studio"
      data-status={status}
      style={{
        position: "relative",
        overflow: "hidden",
        background: poster ?? posterBackground(colors),
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
