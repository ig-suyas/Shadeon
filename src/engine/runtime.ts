/**
 * Shadeon runtime: a small, dependency-free WebGL runner for full-screen
 * fragment shaders. MIT licensed. This file is self-contained on purpose:
 * the code Shadeon lets you copy is this exact source.
 */

export type ShaderValue = number | boolean | string | readonly number[] | readonly string[];
export type ShaderSettings = Record<string, ShaderValue | undefined>;
export type GL = WebGLRenderingContext | WebGL2RenderingContext;

export interface ShaderProgram {
  program: WebGLProgram;
  locations: Map<string, WebGLUniformLocation | null>;
}

export interface FrameState {
  time: number;
  width: number;
  height: number;
  pointer: readonly [number, number];
  scroll: number;
}

export interface MountOptions {
  /** Initial uniform values: colors, speed, scale, intensity, seed and shader extras. */
  settings?: ShaderSettings;
  /** Upper bound for devicePixelRatio. Default 2. */
  maxDpr?: number;
  /** Cap the frame rate (for example 30). Default: display refresh rate. */
  fps?: number;
  /** Start paused. A paused shader still draws when resized or updated. */
  paused?: boolean;
  /** Lower the render resolution automatically when frames drop. Default true. */
  adaptive?: boolean;
  /** "respect" (default) draws one still frame when the user prefers reduced motion. */
  reducedMotion?: "respect" | "ignore";
  /** Time in seconds used for the still frame. */
  stillTime?: number;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export interface ShaderHandle {
  set(settings: ShaderSettings): void;
  pause(): void;
  play(): void;
  destroy(): void;
}

const VERTEX_SOURCE =
  "attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.0,1.0);}";

export function createContext(canvas: HTMLCanvasElement): GL | null {
  const attributes: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
  };
  return (canvas.getContext("webgl2", attributes) ??
    canvas.getContext("webgl", attributes)) as GL | null;
}

/** One triangle that covers the whole viewport. Call again after a context restore. */
export function bindTriangle(gl: GL): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
}

export function createProgram(gl: GL, fragment: string): ShaderProgram {
  const compile = (type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Shadeon: could not create a shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
      const log = gl.getShaderInfoLog(shader) ?? "unknown error";
      gl.deleteShader(shader);
      throw new Error(`Shadeon: shader failed to compile\n${log}`);
    }
    return shader;
  };
  const vertexShader = compile(gl.VERTEX_SHADER, VERTEX_SOURCE);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!program) throw new Error("Shadeon: could not create a program");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.bindAttribLocation(program, 0, "a_position");
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    const log = gl.getProgramInfoLog(program) ?? "unknown error";
    gl.deleteProgram(program);
    throw new Error(`Shadeon: program failed to link\n${log}`);
  }
  return { program, locations: new Map() };
}

function locate(gl: GL, shader: ShaderProgram, name: string): WebGLUniformLocation | null {
  let location = shader.locations.get(name);
  if (location === undefined) {
    location = gl.getUniformLocation(shader.program, name);
    shader.locations.set(name, location);
  }
  return location;
}

/** "#rrggbb" or "#rgb" to 0..1 RGB. Invalid input becomes black. */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.replace(/./g, "$&$&");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [0, 0, 0];
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Maps settings to uniforms: `colors` fills u_color1..n, every other key `k`
 * sets `u_k`. `speed` is not a uniform; it scales u_time.
 */
export function setUniforms(gl: GL, shader: ShaderProgram, settings: ShaderSettings): void {
  gl.useProgram(shader.program);
  for (const key of Object.keys(settings)) {
    const value = settings[key];
    if (value === undefined || key === "speed") continue;
    if (key === "colors" && typeof value === "object") {
      value.forEach((color, index) => {
        const location = locate(gl, shader, `u_color${index + 1}`);
        if (location && typeof color === "string") gl.uniform3fv(location, hexToRgb(color));
      });
      continue;
    }
    const location = locate(gl, shader, `u_${key}`);
    if (!location) continue;
    if (typeof value === "number") gl.uniform1f(location, value);
    else if (typeof value === "boolean") gl.uniform1f(location, value ? 1 : 0);
    else if (typeof value === "string") gl.uniform3fv(location, hexToRgb(value));
    else {
      const numbers = value.map(Number);
      if (numbers.length === 2) gl.uniform2fv(location, numbers);
      else if (numbers.length === 3) gl.uniform3fv(location, numbers);
      else if (numbers.length === 4) gl.uniform4fv(location, numbers);
    }
  }
}

export function drawFrame(gl: GL, shader: ShaderProgram, frame: FrameState): void {
  gl.useProgram(shader.program);
  gl.viewport(0, 0, frame.width, frame.height);
  const time = locate(gl, shader, "u_time");
  if (time) gl.uniform1f(time, frame.time);
  const resolution = locate(gl, shader, "u_resolution");
  if (resolution) gl.uniform2f(resolution, frame.width, frame.height);
  const pointer = locate(gl, shader, "u_pointer");
  if (pointer) gl.uniform2f(pointer, frame.pointer[0], frame.pointer[1]);
  const scroll = locate(gl, shader, "u_scroll");
  if (scroll) gl.uniform1f(scroll, frame.scroll);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

export interface QualityGovernor {
  /** Current render-resolution multiplier (1, 0.75 or 0.5). */
  readonly scale: number;
  /** Feed the time between animation frames. Returns true when `scale` changed. */
  sample(frameMs: number): boolean;
}

/** Steps resolution down after a sustained run of slow frames, and carefully back up. */
export function createQualityGovernor(steps: readonly number[] = [1, 0.75, 0.5]): QualityGovernor {
  let index = 0;
  let average = 16.7;
  let slow = 0;
  let fast = 0;
  let patience = 600;
  return {
    get scale() {
      return steps[index] ?? 1;
    },
    sample(frameMs) {
      if (frameMs <= 0 || frameMs > 250) return false; // tab switch or a one-off hitch
      average += (frameMs - average) * 0.1;
      if (average > 22) {
        slow += 1;
        fast = 0;
      } else if (average < 18) {
        fast += 1;
        slow = 0;
      } else {
        slow = 0;
        fast = 0;
      }
      if (slow > 45 && index < steps.length - 1) {
        index += 1;
        slow = 0;
        average = 16.7;
        return true;
      }
      if (fast > patience && index > 0) {
        index -= 1;
        fast = 0;
        patience *= 2; // each retry waits longer, so quality does not oscillate
        return true;
      }
      return false;
    },
  };
}

/**
 * Runs a fragment shader on a canvas. WebGL starts only when the canvas first
 * scrolls into view; the loop stops while it is off-screen or the tab is hidden.
 * The canvas must be sized by CSS (for example width: 100%; height: 100%).
 */
export function mountShader(
  canvas: HTMLCanvasElement,
  fragment: string,
  options: MountOptions = {},
): ShaderHandle {
  const settings: ShaderSettings = { ...options.settings };
  const maxDpr = options.maxDpr ?? 2;
  const frameBudget = options.fps ? 1000 / options.fps - 2 : 0;
  const governor = createQualityGovernor();
  const motion =
    options.reducedMotion !== "ignore" && typeof matchMedia === "function"
      ? matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  const pointer: [number, number] = [0.5, 0.5];
  const pointerTarget: [number, number] = [0.5, 0.5];

  let gl: GL | null = null;
  let shader: ShaderProgram | null = null;
  let still = motion?.matches ?? false;
  let paused = options.paused ?? false;
  let visible = false;
  let failed = false;
  let destroyed = false;
  let ready = false;
  let dirty = true;
  let usesPointer = false;
  let usesScroll = false;
  let frameId = 0;
  let lastTick = 0;
  let lastDraw = 0;
  let time = 0;
  let scroll = 0;

  const fail = (error: unknown): void => {
    failed = true;
    shader = null;
    options.onError?.(error instanceof Error ? error : new Error(String(error)));
  };

  const init = (): void => {
    try {
      gl = gl ?? createContext(canvas);
      if (!gl) throw new Error("Shadeon: WebGL is not available");
      bindTriangle(gl);
      shader = createProgram(gl, fragment);
      setUniforms(gl, shader, settings);
      usesPointer = locate(gl, shader, "u_pointer") !== null;
      usesScroll = locate(gl, shader, "u_scroll") !== null;
      if (usesScroll) onScroll();
    } catch (error) {
      fail(error);
    }
  };

  const resize = (): void => {
    const ratio = Math.min(window.devicePixelRatio || 1, maxDpr) * governor.scale;
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    dirty = true;
  };

  const animating = (): boolean => !still && !paused;

  const schedule = (): void => {
    if (frameId || destroyed || failed || !shader || !visible || document.hidden) return;
    if (animating() || dirty) frameId = requestAnimationFrame(tick);
  };

  const tick = (now: number): void => {
    frameId = 0;
    if (!gl || !shader) return;
    const elapsed = lastTick ? now - lastTick : 0;
    lastTick = now;
    if (animating()) {
      if (options.adaptive !== false && governor.sample(elapsed)) resize();
      const delta = Math.min(elapsed, 100);
      const speed = typeof settings.speed === "number" ? settings.speed : 1;
      time += (delta / 1000) * speed;
      const ease = Math.min(1, delta * 0.008);
      pointer[0] += (pointerTarget[0] - pointer[0]) * ease;
      pointer[1] += (pointerTarget[1] - pointer[1]) * ease;
    }
    if (dirty || !frameBudget || now - lastDraw >= frameBudget) {
      drawFrame(gl, shader, {
        time: still ? (options.stillTime ?? time) : time,
        width: canvas.width,
        height: canvas.height,
        pointer,
        scroll,
      });
      lastDraw = now;
      dirty = false;
      if (!ready) {
        ready = true;
        options.onReady?.();
      }
    }
    schedule();
  };

  const wake = (): void => {
    lastTick = 0;
    schedule();
  };

  const onPointer = (event: PointerEvent): void => {
    if (!usesPointer) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerTarget[0] = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    pointerTarget[1] = Math.min(1, Math.max(0, 1 - (event.clientY - rect.top) / rect.height));
  };

  function onScroll(): void {
    if (!usesScroll) return;
    const range = document.documentElement.scrollHeight - window.innerHeight;
    scroll = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
    dirty = true;
    schedule();
  }

  const onMotionChange = (): void => {
    still = motion?.matches ?? false;
    dirty = true;
    wake();
  };

  const onContextLost = (event: Event): void => {
    event.preventDefault();
    shader = null;
    cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const onContextRestored = (): void => {
    init();
    dirty = true;
    wake();
  };

  const visibility = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? false;
      if (visible && !shader && !failed) {
        init();
        resize();
      }
      wake();
    },
    { rootMargin: "64px" },
  );
  const sizing = new ResizeObserver(() => {
    resize();
    schedule();
  });

  visibility.observe(canvas);
  sizing.observe(canvas);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  motion?.addEventListener("change", onMotionChange);

  return {
    set(next) {
      Object.assign(settings, next);
      if (gl && shader) setUniforms(gl, shader, next);
      dirty = true;
      schedule();
    },
    pause() {
      paused = true;
    },
    play() {
      paused = false;
      wake();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frameId);
      visibility.disconnect();
      sizing.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      motion?.removeEventListener("change", onMotionChange);
      if (gl && shader) gl.deleteProgram(shader.program);
      shader = null;
    },
  };
}
