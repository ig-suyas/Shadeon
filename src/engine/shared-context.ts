import {
  bindTriangle,
  createContext,
  createFeedback,
  createProgram,
  createQualityGovernor,
  deleteFeedback,
  drawFrame,
  setUniforms,
  usesFeedback,
  warmUp,
  type Feedback,
  type GL,
  type ShaderProgram,
  type ShaderSettings,
} from "./runtime";

/**
 * One WebGL context for every gallery card.
 *
 * Browsers cap live WebGL contexts (about 16, fewer on phones), so cards never
 * own one. Each card is a plain 2D canvas (a "slot"). Per frame, every visible
 * slot's shader is rendered into a single hidden WebGL canvas and copied into
 * the slot with drawImage. Cards therefore scroll, clip and animate like any
 * other DOM element.
 */

export interface SlotOptions {
  fragment: string;
  settings: ShaderSettings;
  /** Time in seconds for the still frame (reduced motion, or over the active limit). */
  stillTime?: number;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export interface Slot {
  set(settings: ShaderSettings): void;
  pause(): void;
  play(): void;
  destroy(): void;
}

export interface SharedConfig {
  /** Device pixel ratio used for slots. */
  dpr: number;
  /** Frame-rate cap for slots; 0 follows the display. */
  fps: number;
  /** Maximum number of slots animating at once. The rest hold a still frame. */
  maxActive: number;
}

interface SlotState {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  options: SlotOptions;
  settings: ShaderSettings;
  time: number;
  cssWidth: number;
  cssHeight: number;
  visible: boolean;
  paused: boolean;
  dirty: boolean;
  ready: boolean;
  failed: boolean;
  /** Frame memory, for shaders that declare u_prev (one per slot, at its size). */
  feedback: Feedback | null;
}

const CENTER = [0.5, 0.5] as const;

const config: SharedConfig = { dpr: 1, fps: 0, maxActive: 12 };
const slots = new Map<HTMLCanvasElement, SlotState>();
const programs = new Map<string, ShaderProgram>();
const governor = createQualityGovernor();

let surface: HTMLCanvasElement | null = null;
let gl: GL | null = null;
let unavailable = false;
let lost = false;
let still = false;
let frameId = 0;
let lastTick = 0;
let lastDraw = 0;
let visibility: IntersectionObserver | null = null;
let sizing: ResizeObserver | null = null;
let motion: MediaQueryList | null = null;
let listening = false;

export function configureShared(next: Partial<SharedConfig>): void {
  Object.assign(config, next);
  for (const slot of slots.values()) slot.dirty = true;
  schedule();
}

function ensureContext(): GL | null {
  if (gl || unavailable) return gl;
  surface = document.createElement("canvas");
  gl = createContext(surface);
  if (!gl) {
    unavailable = true;
    return null;
  }
  bindTriangle(gl);
  surface.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    programs.clear();
    for (const slot of slots.values()) slot.feedback = null;
  });
  surface.addEventListener("webglcontextrestored", () => {
    lost = false;
    if (gl) bindTriangle(gl);
    for (const slot of slots.values()) slot.dirty = true;
    wake();
  });
  return gl;
}

function ensureObservers(): void {
  if (listening) return;
  listening = true;
  visibility = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const slot = slots.get(entry.target as HTMLCanvasElement);
        if (!slot) continue;
        slot.visible = entry.isIntersecting;
        if (slot.visible) slot.dirty = true;
      }
      wake();
    },
    { rootMargin: "64px" },
  );
  sizing = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const slot = slots.get(entry.target as HTMLCanvasElement);
      if (!slot) continue;
      slot.cssWidth = entry.contentRect.width;
      slot.cssHeight = entry.contentRect.height;
      slot.dirty = true;
    }
    schedule();
  });
  if (typeof matchMedia === "function") {
    motion = matchMedia("(prefers-reduced-motion: reduce)");
    still = motion.matches;
    motion.addEventListener("change", onMotionChange);
  }
  document.addEventListener("visibilitychange", wake);
}

function onMotionChange(): void {
  still = motion?.matches ?? false;
  for (const slot of slots.values()) slot.dirty = true;
  wake();
}

function wake(): void {
  lastTick = 0;
  schedule();
}

function needsFrame(): boolean {
  for (const slot of slots.values()) {
    if (!slot.visible || slot.failed) continue;
    if (slot.dirty || (!still && !slot.paused)) return true;
  }
  return false;
}

function schedule(): void {
  if (frameId || lost || unavailable || document.hidden) return;
  if (needsFrame()) frameId = requestAnimationFrame(tick);
}

function fail(slot: SlotState, error: unknown): void {
  slot.failed = true;
  slot.options.onError?.(error instanceof Error ? error : new Error(String(error)));
}

function render(
  slot: SlotState,
  context: GL,
  target: HTMLCanvasElement,
  time: number,
  delta = 1 / 60,
): void {
  const ratio = config.dpr * governor.scale;
  const width = Math.max(1, Math.round(slot.cssWidth * ratio));
  const height = Math.max(1, Math.round(slot.cssHeight * ratio));
  if (slot.canvas.width !== width || slot.canvas.height !== height) {
    slot.canvas.width = width;
    slot.canvas.height = height;
  }
  // The surface only ever grows, so resizing (which clears it) stays rare.
  if (target.width < width || target.height < height) {
    target.width = Math.max(target.width, width);
    target.height = Math.max(target.height, height);
  }
  let program = programs.get(slot.options.fragment);
  if (!program) {
    program = createProgram(context, slot.options.fragment);
    programs.set(slot.options.fragment, program);
  }
  // Programs are shared between slots, so every uniform is set on every draw.
  setUniforms(context, program, slot.settings);
  const frame = { time, width, height, pointer: CENTER, scroll: 0, delta };
  if (usesFeedback(context, program)) {
    const fresh =
      !slot.feedback || slot.feedback.width !== width || slot.feedback.height !== height;
    if (fresh) {
      if (slot.feedback) deleteFeedback(context, slot.feedback);
      slot.feedback = createFeedback(context, width, height);
    }
    // A still frame (reduced motion) is given history first; animated slots
    // build theirs live, which costs nothing extra.
    if (still && slot.feedback) warmUp(context, program, frame, slot.feedback);
  }
  drawFrame(context, program, frame, slot.feedback);
  // WebGL's origin is bottom-left: the viewport sits in the surface's bottom rows.
  slot.context.drawImage(target, 0, target.height - height, width, height, 0, 0, width, height);
  slot.dirty = false;
  if (!slot.ready) {
    slot.ready = true;
    slot.options.onReady?.();
  }
}

function tick(now: number): void {
  frameId = 0;
  const context = ensureContext();
  if (!context || !surface) {
    for (const slot of slots.values()) {
      if (!slot.failed) fail(slot, new Error("Shadeon: WebGL is not available"));
    }
    return;
  }
  const elapsed = lastTick ? now - lastTick : 0;
  lastTick = now;
  if (!still && governor.sample(elapsed)) {
    for (const slot of slots.values()) slot.dirty = true;
  }
  const delta = Math.min(elapsed, 100) / 1000;
  const due = !config.fps || now - lastDraw >= 1000 / config.fps - 2;
  let active = 0;
  let drew = false;
  for (const slot of slots.values()) {
    if (!slot.visible || slot.failed || slot.cssWidth < 1 || slot.cssHeight < 1) continue;
    const animate = !still && !slot.paused && active < config.maxActive;
    if (animate) {
      active += 1;
      const speed = typeof slot.settings.speed === "number" ? slot.settings.speed : 1;
      slot.time += delta * speed;
    }
    if (!slot.dirty && !(animate && due)) continue;
    try {
      const time = still ? (slot.options.stillTime ?? slot.time) : slot.time;
      render(slot, context, surface, time, Math.min(Math.max(delta, 1 / 240), 0.05));
      drew = true;
    } catch (error) {
      fail(slot, error);
    }
  }
  if (drew && due) lastDraw = now;
  schedule();
}

export function addSlot(canvas: HTMLCanvasElement, options: SlotOptions): Slot {
  const context = canvas.getContext("2d");
  if (!context || unavailable) {
    options.onError?.(new Error("Shadeon: canvas rendering is not available"));
    return { set() {}, pause() {}, play() {}, destroy() {} };
  }
  ensureObservers();
  const slot: SlotState = {
    canvas,
    context,
    options,
    settings: { ...options.settings },
    time: options.stillTime ?? 0,
    cssWidth: canvas.clientWidth,
    cssHeight: canvas.clientHeight,
    visible: false,
    paused: false,
    dirty: true,
    ready: false,
    failed: false,
    feedback: null,
  };
  slots.set(canvas, slot);
  visibility?.observe(canvas);
  sizing?.observe(canvas);
  return {
    set(next) {
      Object.assign(slot.settings, next);
      slot.dirty = true;
      schedule();
    },
    pause() {
      slot.paused = true;
    },
    play() {
      slot.paused = false;
      wake();
    },
    destroy() {
      if (gl && slot.feedback) deleteFeedback(gl, slot.feedback);
      slot.feedback = null;
      slots.delete(canvas);
      visibility?.unobserve(canvas);
      sizing?.unobserve(canvas);
    },
  };
}

/** Number of slots and compiled programs; used by tests and the dev playground. */
export function sharedStats(): {
  slots: number;
  visible: number;
  programs: number;
  scale: number;
  context: boolean;
} {
  let visible = 0;
  for (const slot of slots.values()) if (slot.visible && !slot.failed) visible += 1;
  return {
    slots: slots.size,
    visible,
    programs: programs.size,
    scale: governor.scale,
    context: gl !== null,
  };
}

/** Tears everything down. Tests only. */
export function resetShared(): void {
  cancelAnimationFrame(frameId);
  frameId = 0;
  visibility?.disconnect();
  sizing?.disconnect();
  motion?.removeEventListener("change", onMotionChange);
  if (listening) document.removeEventListener("visibilitychange", wake);
  slots.clear();
  programs.clear();
  surface = null;
  gl = null;
  visibility = null;
  sizing = null;
  motion = null;
  listening = false;
  unavailable = false;
  lost = false;
  still = false;
  lastTick = 0;
  lastDraw = 0;
  Object.assign(config, { dpr: 1, fps: 0, maxActive: 12 });
}
