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
  /** 0..1: how much the pointer has been moving lately (u_activity). */
  activity?: number;
  /** Pointer velocity in canvas widths/heights per second (u_velocity). */
  velocity?: readonly [number, number];
  /** Seconds since the previous frame, at most 0.05 (u_delta); 1/60 when unknown. */
  delta?: number;
}

/**
 * Frame memory for shaders that declare `uniform sampler2D u_prev`. Such a
 * shader runs twice per frame: with `u_pass` 0 it reads its previous state
 * from u_prev and writes the next state (into a texture); with `u_pass` 1 it
 * reads that new state from u_prev and writes the colour shown on screen.
 * Ink, fog and trails that persist and drift are built this way.
 */
export interface Feedback {
  textures: WebGLTexture[];
  buffers: WebGLFramebuffer[];
  width: number;
  height: number;
  index: number;
}

const HALF_FLOAT_OES = 0x8d61;

/** Two state textures: half-float where the browser can render to it, else 8-bit. */
export function createFeedback(gl: GL, width: number, height: number, precise = true): Feedback {
  const webgl2 =
    typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
  let internal: number = gl.RGBA;
  let type: number = gl.UNSIGNED_BYTE;
  if (precise && webgl2 && gl.getExtension("EXT_color_buffer_float")) {
    internal = (gl as WebGL2RenderingContext).RGBA16F;
    type = (gl as WebGL2RenderingContext).HALF_FLOAT;
  } else if (
    precise &&
    !webgl2 &&
    gl.getExtension("OES_texture_half_float") &&
    gl.getExtension("OES_texture_half_float_linear") &&
    gl.getExtension("EXT_color_buffer_half_float")
  ) {
    type = HALF_FLOAT_OES;
  }
  const feedback: Feedback = { textures: [], buffers: [], width, height, index: 0 };
  for (let i = 0; i < 2; i++) {
    const texture = gl.createTexture();
    const buffer = gl.createFramebuffer();
    if (!texture || !buffer) throw new Error("Shadeon: could not create frame memory");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, gl.RGBA, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    feedback.textures.push(texture);
    feedback.buffers.push(buffer);
  }
  const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!complete && type !== gl.UNSIGNED_BYTE) {
    deleteFeedback(gl, feedback);
    return createFeedback(gl, width, height, false);
  }
  return feedback;
}

export function deleteFeedback(gl: GL, feedback: Feedback): void {
  for (const texture of feedback.textures) gl.deleteTexture(texture);
  for (const buffer of feedback.buffers) gl.deleteFramebuffer(buffer);
}

/** True when the shader declares u_prev, so it needs frame memory. */
export function usesFeedback(gl: GL, shader: ShaderProgram): boolean {
  return locate(gl, shader, "u_prev") !== null;
}

export interface MountOptions {
  /** Initial uniform values: colors, speed, scale, intensity, seed and shader extras. */
  settings?: ShaderSettings;
  /** Upper bound for devicePixelRatio. Default 1.5. */
  maxDpr?: number;
  /** Cap the frame rate (for example 30). Default: display refresh rate. */
  fps?: number;
  /** Start paused. A paused shader still draws when resized or updated. */
  paused?: boolean;
  /** Lower the render resolution automatically when frames drop. Default true. */
  adaptive?: boolean;
  /** Transparent canvas: the shader's alpha shows the page behind it. Default false. */
  transparent?: boolean;
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

/** With `transparent`, write premultiplied colour (rgb * a, a) from the shader. */
export function createContext(canvas: HTMLCanvasElement, transparent = false): GL | null {
  const attributes: WebGLContextAttributes = {
    alpha: transparent,
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

/**
 * Draws one frame. With frame memory, it first steps the state (pass 0), then
 * draws it (pass 1); `display: false` only steps (used to warm up a still frame).
 */
export function drawFrame(
  gl: GL,
  shader: ShaderProgram,
  frame: FrameState,
  feedback?: Feedback | null,
  display = true,
): void {
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
  const activity = locate(gl, shader, "u_activity");
  if (activity) gl.uniform1f(activity, frame.activity ?? 0);
  const delta = locate(gl, shader, "u_delta");
  if (delta) gl.uniform1f(delta, frame.delta ?? 1 / 60);
  const velocity = locate(gl, shader, "u_velocity");
  if (velocity) gl.uniform2f(velocity, frame.velocity?.[0] ?? 0, frame.velocity?.[1] ?? 0);
  const prev = locate(gl, shader, "u_prev");
  if (!prev || !feedback) {
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return;
  }
  const pass = locate(gl, shader, "u_pass");
  const next = 1 - feedback.index;
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(prev, 0);
  // Pass 0: previous state in, next state out.
  gl.bindFramebuffer(gl.FRAMEBUFFER, feedback.buffers[next] ?? null);
  gl.bindTexture(gl.TEXTURE_2D, feedback.textures[feedback.index] ?? null);
  if (pass) gl.uniform1f(pass, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  feedback.index = next;
  if (!display) return;
  // Pass 1: the new state in, colour out.
  gl.bindTexture(gl.TEXTURE_2D, feedback.textures[next] ?? null);
  if (pass) gl.uniform1f(pass, 1);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

/**
 * Steps frame memory through the 4 s before `time` in 60 larger steps, so a
 * still frame (reduced motion) has history. Animated surfaces skip this and
 * build their history live.
 */
export function warmUp(gl: GL, shader: ShaderProgram, frame: FrameState, feedback: Feedback): void {
  for (const buffer of feedback.buffers) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  for (let i = 0; i < 60; i++) {
    const step = { ...frame, time: frame.time - (60 - i) / 15, delta: 1 / 15 };
    drawFrame(gl, shader, step, feedback, false);
  }
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
  const maxDpr = options.maxDpr ?? 1.5;
  const frameBudget = options.fps ? 1000 / options.fps - 2 : 0;
  const governor = createQualityGovernor();
  const motion =
    options.reducedMotion !== "ignore" && typeof matchMedia === "function"
      ? matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  const pointer: [number, number] = [0.5, 0.5];
  const pointerTarget: [number, number] = [0.5, 0.5];
  // Recent pointer movement, rising as it moves and fading over about a second.
  let activity = 0;
  let activityTarget = 0;
  const velocity: [number, number] = [0, 0];
  let feedback: Feedback | null = null;
  let memory = false;

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
      gl = gl ?? createContext(canvas, options.transparent);
      if (!gl) throw new Error("Shadeon: WebGL is not available");
      bindTriangle(gl);
      shader = createProgram(gl, fragment);
      setUniforms(gl, shader, settings);
      usesPointer = locate(gl, shader, "u_pointer") !== null;
      memory = usesFeedback(gl, shader);
      feedback = null;
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
    if (gl && memory && (!feedback || feedback.width !== width || feedback.height !== height)) {
      if (feedback) deleteFeedback(gl, feedback);
      feedback = createFeedback(gl, width, height);
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
      // Frame-rate independent easing: close 7% of the gap per 60 fps frame.
      const ease = 1 - Math.pow(0.93, delta / 16.7);
      const lastX = pointer[0];
      const lastY = pointer[1];
      pointer[0] += (pointerTarget[0] - pointer[0]) * ease;
      pointer[1] += (pointerTarget[1] - pointer[1]) * ease;
      if (delta > 0) {
        velocity[0] += ((pointer[0] - lastX) / (delta / 1000) - velocity[0]) * 0.5;
        velocity[1] += ((pointer[1] - lastY) / (delta / 1000) - velocity[1]) * 0.5;
      }
      activityTarget *= Math.pow(0.97, delta / 16.7);
      activity += (activityTarget - activity) * ease;
    }
    if (memory && !feedback) resize();
    if (dirty || !frameBudget || now - lastDraw >= frameBudget) {
      const frame: FrameState = {
        time: still ? (options.stillTime ?? time) : time,
        width: canvas.width,
        height: canvas.height,
        pointer,
        scroll,
        activity: still ? 0 : activity,
        velocity: still ? [0, 0] : velocity,
        delta: Math.min(elapsed, 50) / 1000 || 1 / 60,
      };
      if (still && feedback) warmUp(gl, shader, frame, feedback);
      drawFrame(gl, shader, frame, feedback);
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
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, 1 - (event.clientY - rect.top) / rect.height));
    // A tap counts as a burst of movement, so touch screens get a response too.
    const moved =
      event.type === "pointerdown"
        ? 0.6
        : Math.hypot(x - pointerTarget[0], y - pointerTarget[1]) * 4;
    activityTarget = Math.min(1, activityTarget + moved);
    pointerTarget[0] = x;
    pointerTarget[1] = y;
    schedule();
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
    feedback = null;
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
  window.addEventListener("pointerdown", onPointer, { passive: true });
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
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onScroll);
      motion?.removeEventListener("change", onMotionChange);
      if (gl && feedback) deleteFeedback(gl, feedback);
      if (gl && shader) gl.deleteProgram(shader.program);
      shader = null;
      feedback = null;
    },
  };
}
