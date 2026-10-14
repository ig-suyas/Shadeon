"use client";

import { useEffect, useRef, useState } from "react";
import { acquireDedicated } from "@/engine/context-budget";
import { getDeviceProfile } from "@/engine/device";
import { onThemeChange } from "@/lib/theme";
import type { LiquidEngine, Rect } from "./liquid-engine";

/** Hero tokens in shader order: page, shadow tone, accent, highlight. */
const COLOR_VARS = ["--hero-1", "--hero-2", "--hero-3", "--hero-4"] as const;
/** The sculpture frame used for the still image (and for reduced motion). */
const STILL_TIME = 7.5;
/** Size of the rendered sculpture image the engine samples. */
const IMAGE_W = 2000;
const IMAGE_H = 800;
/**
 * Desktop (owner, 2026-10-14: "a bit wider"): a wider image with longer arms,
 * so the form spans more of the page at the same height. Phones keep the
 * original image, which their layout fits by width.
 */
const WIDE_MIN = 1024;
const WIDE_IMAGE_W = 2640;
const WIDE_ARM = 1.6;

function themeColors(): string[] {
  const computed = getComputedStyle(document.documentElement);
  return COLOR_VARS.map((name) => computed.getPropertyValue(name).trim());
}

/**
 * The sculpture sits centred in the band between the floating header and the
 * hero copy, as wide as the hero (it may bleed off the sides on small screens).
 */
function computeRect(w: number, aspect: number, band: { top: number; bottom: number }): Rect {
  const bandH = Math.max(80, band.bottom - band.top);
  let rw: number;
  let maxH: number;
  if (w >= 1024) {
    rw = w * 1.02;
    maxH = bandH * 1.1;
  } else if (w >= 640) {
    rw = w * 1.3;
    maxH = bandH * 1.15;
  } else {
    rw = w * 1.9;
    maxH = bandH * 1.2;
  }
  if (rw / aspect > maxH) rw = maxH * aspect;
  const rh = rw / aspect;
  const cy = (band.top + band.bottom) / 2;
  return { x: w / 2 - rw / 2, y: cy - rh / 2, w: rw, h: rh };
}

/**
 * The live sculpture behind the hero copy. Our silk sculpture is rendered once
 * into an image, which the liquid engine (adapted from Guglielmo
 * Giannattasio's MIT "Sculpture Hero") turns into ~100k GPU particles: the
 * cursor turns the material liquid and a resting cursor winds it into a
 * vortex; it settles back into the crisp image. Without WebGL2 and float
 * render targets, the animated points version runs instead. A CSS poster
 * paints first; the canvas fades in over it with no layout shift.
 */
export function HeroSculpture() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  // Canvases are created imperatively (one per renderer), so fade them here.
  useEffect(() => {
    hostRef.current?.querySelectorAll("canvas").forEach((canvas) => {
      canvas.style.opacity = live ? "1" : "0";
    });
  }, [live]);

  useEffect(() => {
    const host = hostRef.current;
    const section = host?.closest("section");
    if (!host || !section) return;
    let cancelled = false;
    const cleanups: (() => void)[] = [];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = matchMedia("(hover: none), (pointer: coarse)");
    const profile = getDeviceProfile();
    const lowPower = profile.lowPower || coarse.matches;

    // A fresh canvas per renderer: a canvas is tied to one context for life.
    const makeCanvas = (): HTMLCanvasElement => {
      const canvas = document.createElement("canvas");
      canvas.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;" +
        "transition:opacity var(--duration-reveal) var(--ease-enter)";
      host.appendChild(canvas);
      cleanups.push(() => canvas.remove());
      return canvas;
    };

    const startFallback = async (): Promise<void> => {
      const { mountSculpture } = await import("./particle-sculpture");
      if (cancelled) return;
      const canvas = makeCanvas();
      const handle = mountSculpture(canvas, {
        colors: themeColors(),
        maxDpr: profile.surfaceDpr,
        count: profile.lowPower ? 90_000 : coarse.matches ? 130_000 : 240_000,
        stillTime: STILL_TIME,
        onReady: () => {
          if (cancelled) return;
          canvas.style.opacity = "1";
          setLive(true);
        },
      });
      const unsubscribe = onThemeChange(() => handle.setColors(themeColors()));
      cleanups.push(() => {
        unsubscribe();
        handle.destroy();
      });
    };

    const startLiquid = async (): Promise<void> => {
      const [{ LiquidEngine }, { renderSculptureImage }] = await Promise.all([
        import("./liquid-engine"),
        import("./particle-sculpture"),
      ]);
      if (cancelled) return;
      // Chosen once per mount: the image is the particles' home.
      const wide = section.getBoundingClientRect().width >= WIDE_MIN;
      const render = (): HTMLCanvasElement | null =>
        renderSculptureImage(themeColors(), wide ? WIDE_IMAGE_W : IMAGE_W, IMAGE_H, {
          count: lowPower ? 320_000 : 520_000,
          time: STILL_TIME,
          arm: wide ? WIDE_ARM : 1,
        });
      const image = render();
      if (!image) throw new Error("Could not render the sculpture");

      const canvas = makeCanvas();
      let engine: LiquidEngine | null;
      try {
        engine = new LiquidEngine(canvas, {
          maxDpr: profile.surfaceDpr,
          lowPower,
          reducedMotion: reduced.matches,
          onFail: () => {
            if (!cancelled) setLive(false);
          },
        });
      } catch (error) {
        canvas.remove();
        throw error;
      }
      const release = acquireDedicated(() => {
        engine?.destroy();
        engine = null;
        setLive(false);
      });
      cleanups.push(() => {
        engine?.destroy();
        engine = null;
        release();
      });

      const relayout = (): void => {
        if (!engine) return;
        const bounds = section.getBoundingClientRect();
        const copy = section.querySelector<HTMLElement>("[data-hero-copy]");
        const header =
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue("--header-height"),
          ) || 64;
        const band = {
          top: header + 8,
          bottom: copy ? copy.getBoundingClientRect().top - bounds.top - 8 : bounds.height,
        };
        engine.resize(
          bounds.width,
          bounds.height,
          computeRect(bounds.width, engine.imageAspect, band),
        );
      };

      engine.onFirstFrame = () => {
        if (cancelled) return;
        canvas.style.opacity = "1";
        setLive(true);
      };
      engine.setImage(image);
      relayout();

      const sizing = new ResizeObserver(relayout);
      sizing.observe(section);
      const copy = section.querySelector("[data-hero-copy]");
      if (copy) sizing.observe(copy);
      const visibility = new IntersectionObserver((entries) => {
        for (const entry of entries) engine?.setVisible(entry.isIntersecting && !document.hidden);
      });
      visibility.observe(section);
      const onHidden = (): void => engine?.setVisible(!document.hidden);
      document.addEventListener("visibilitychange", onHidden);
      const onMotion = (): void => engine?.setReducedMotion(reduced.matches);
      reduced.addEventListener("change", onMotion);
      const unsubscribe = onThemeChange(() => {
        const next = render();
        if (next) engine?.setImage(next);
        relayout();
      });

      const position = (event: PointerEvent): readonly [number, number] => {
        const bounds = section.getBoundingClientRect();
        return [event.clientX - bounds.left, event.clientY - bounds.top];
      };
      const onMove = (event: PointerEvent): void => {
        const touch = event.pointerType === "touch";
        if (touch && event.buttons === 0 && event.pressure === 0) return;
        const [x, y] = position(event);
        engine?.pointer("move", x, y, touch);
      };
      const onDown = (event: PointerEvent): void => {
        const [x, y] = position(event);
        engine?.pointer("down", x, y, event.pointerType === "touch");
      };
      const onUp = (event: PointerEvent): void => {
        const [x, y] = position(event);
        engine?.pointer("up", x, y, event.pointerType === "touch");
      };
      const onLeave = (event: PointerEvent): void => {
        const [x, y] = position(event);
        engine?.pointer("leave", x, y, event.pointerType === "touch");
      };
      section.addEventListener("pointermove", onMove, { passive: true });
      section.addEventListener("pointerdown", onDown, { passive: true });
      section.addEventListener("pointerup", onUp, { passive: true });
      section.addEventListener("pointercancel", onUp, { passive: true });
      section.addEventListener("pointerleave", onLeave, { passive: true });

      cleanups.push(() => {
        sizing.disconnect();
        visibility.disconnect();
        document.removeEventListener("visibilitychange", onHidden);
        reduced.removeEventListener("change", onMotion);
        unsubscribe();
        section.removeEventListener("pointermove", onMove);
        section.removeEventListener("pointerdown", onDown);
        section.removeEventListener("pointerup", onUp);
        section.removeEventListener("pointercancel", onUp);
        section.removeEventListener("pointerleave", onLeave);
      });
    };

    void startLiquid().catch(() => {
      // No WebGL2 or float render targets: the animated points version.
      if (!cancelled) void startFallback();
    });

    return () => {
      cancelled = true;
      for (const cleanup of cleanups.reverse()) cleanup();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="absolute inset-0 -z-10"
      data-shader="hero-sculpture"
      data-status={live ? "live" : "poster"}
    >
      <div
        className="absolute inset-0 transition-opacity duration-(--duration-reveal) ease-out"
        style={{
          opacity: live ? 0 : 1,
          background:
            "radial-gradient(38% 22% at 50% 34%, color-mix(in srgb, var(--hero-4) 30%, transparent) 0%, transparent 100%)," +
            "radial-gradient(70% 10% at 50% 35%, color-mix(in srgb, var(--hero-2) 40%, transparent) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
