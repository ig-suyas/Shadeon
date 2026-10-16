/**
 * Shadeon studio core (MIT): the shared engine behind Shadeon's multi-pass
 * WebGL2 materials. This file is self-contained on purpose (no imports): the
 * code Shadeon lets you copy inlines this exact source.
 *
 * What it owns, so every material only writes its own physics and lighting:
 * - Input: the cursor eases toward its target with frame-rate independent
 *   easing; velocity is clamped, then smoothed. Presence is an envelope that
 *   rises fast when the pointer arrives and decays slowly when it leaves. A
 *   tap starts a decaying burst. Touch uses Pointer Events with
 *   `touch-action: pan-y`, a short release delay and a larger radius.
 * - Wake: a low-resolution RGBA16F ping-pong flow field. Each frame it is
 *   advected by itself, blurred and decayed, and the pointer paints its
 *   velocity into it along the segment it travelled, so motion lingers.
 * - Lifecycle: WebGL2 with RGBA32F targets when they are renderable and
 *   filterable, else RGBA16F; a DPR cap and a pixel cap; lower quality on
 *   low-power devices and an adaptive resolution governor; pause when
 *   offscreen or the tab is hidden; context loss and restore; full GL
 *   cleanup; prefers-reduced-motion (one still frame, no motion); a settle
 *   detector that stops rendering at rest and a cheap 30 fps mode while the
 *   pointer rests.
 */

// ---------------------------------------------------------------------------
// Small math
// ---------------------------------------------------------------------------

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Mat4 = Float32Array;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Column-major 4x4 matrix helpers (just what the materials need). */
export const mat4 = {
  perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    const m = new Float32Array(16);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = (far + near) * nf;
    m[11] = -1;
    m[14] = 2 * far * near * nf;
    return m;
  },
  lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
    let zx = eye[0] - target[0];
    let zy = eye[1] - target[1];
    let zz = eye[2] - target[2];
    let len = Math.hypot(zx, zy, zz) || 1;
    zx /= len;
    zy /= len;
    zz /= len;
    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz) || 1;
    xx /= len;
    xy /= len;
    xz /= len;
    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;
    const m = new Float32Array(16);
    m[0] = xx;
    m[1] = yx;
    m[2] = zx;
    m[4] = xy;
    m[5] = yy;
    m[6] = zy;
    m[8] = xz;
    m[9] = yz;
    m[10] = zz;
    m[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    m[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    m[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    m[15] = 1;
    return m;
  },
  multiply(a: Mat4, b: Mat4): Mat4 {
    const m = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) sum += (a[k * 4 + r] ?? 0) * (b[c * 4 + k] ?? 0);
        m[c * 4 + r] = sum;
      }
    }
    return m;
  },
  invert(a: Mat4): Mat4 {
    const m = new Float32Array(16);
    const g = (i: number): number => a[i] ?? 0;
    const b00 = g(0) * g(5) - g(1) * g(4);
    const b01 = g(0) * g(6) - g(2) * g(4);
    const b02 = g(0) * g(7) - g(3) * g(4);
    const b03 = g(1) * g(6) - g(2) * g(5);
    const b04 = g(1) * g(7) - g(3) * g(5);
    const b05 = g(2) * g(7) - g(3) * g(6);
    const b06 = g(8) * g(13) - g(9) * g(12);
    const b07 = g(8) * g(14) - g(10) * g(12);
    const b08 = g(8) * g(15) - g(11) * g(12);
    const b09 = g(9) * g(14) - g(10) * g(13);
    const b10 = g(9) * g(15) - g(11) * g(13);
    const b11 = g(10) * g(15) - g(11) * g(14);
    const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    const d = det ? 1 / det : 0;
    m[0] = (g(5) * b11 - g(6) * b10 + g(7) * b09) * d;
    m[1] = (g(2) * b10 - g(1) * b11 - g(3) * b09) * d;
    m[2] = (g(13) * b05 - g(14) * b04 + g(15) * b03) * d;
    m[3] = (g(10) * b04 - g(9) * b05 - g(11) * b03) * d;
    m[4] = (g(6) * b08 - g(4) * b11 - g(7) * b07) * d;
    m[5] = (g(0) * b11 - g(2) * b08 + g(3) * b07) * d;
    m[6] = (g(14) * b02 - g(12) * b05 - g(15) * b01) * d;
    m[7] = (g(8) * b05 - g(10) * b02 + g(11) * b01) * d;
    m[8] = (g(4) * b10 - g(5) * b08 + g(7) * b06) * d;
    m[9] = (g(1) * b08 - g(0) * b10 - g(3) * b06) * d;
    m[10] = (g(12) * b04 - g(13) * b02 + g(15) * b00) * d;
    m[11] = (g(9) * b02 - g(8) * b04 - g(11) * b00) * d;
    m[12] = (g(5) * b07 - g(4) * b09 - g(6) * b06) * d;
    m[13] = (g(0) * b09 - g(1) * b07 + g(2) * b06) * d;
    m[14] = (g(13) * b01 - g(12) * b03 - g(14) * b00) * d;
    m[15] = (g(8) * b03 - g(9) * b01 + g(10) * b00) * d;
    return m;
  },
  /** Transforms a point (w = 1) and divides by w. */
  project(m: Mat4, p: Vec3): Vec3 {
    const g = (i: number): number => m[i] ?? 0;
    const x = g(0) * p[0] + g(4) * p[1] + g(8) * p[2] + g(12);
    const y = g(1) * p[0] + g(5) * p[1] + g(9) * p[2] + g(13);
    const z = g(2) * p[0] + g(6) * p[1] + g(10) * p[2] + g(14);
    const w = g(3) * p[0] + g(7) * p[1] + g(11) * p[2] + g(15) || 1;
    return [x / w, y / w, z / w];
  },
};

/** Where the ray through a screen point (uv, y up) meets the plane y = 0. */
export function rayToGround(inverseViewProjection: Mat4, uv: Vec2): Vec2 {
  const nx = uv[0] * 2 - 1;
  const ny = uv[1] * 2 - 1;
  const a = mat4.project(inverseViewProjection, [nx, ny, -1]);
  const b = mat4.project(inverseViewProjection, [nx, ny, 1]);
  const t = a[1] / (a[1] - b[1] || 1e-6);
  return [a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t];
}

/** "#rrggbb" to linear RGB in [0, 1]. Malformed input becomes mid grey. */
export function hexToLinear(hex: string): Vec3 {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = match ? parseInt(match[1] ?? "808080", 16) : 0x808080;
  const channel = (v: number): number => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return [channel((n >> 16) & 255), channel((n >> 8) & 255), channel(n & 255)];
}

// ---------------------------------------------------------------------------
// Shared GLSL (GLSL ES 3.00)
// ---------------------------------------------------------------------------

/**
 * Noise, curl, the shared energy function, tone mapping and grain. Every
 * material includes this, so energy and finishing look the same everywhere.
 */
export const STUDIO_GLSL = /* glsl */ `
float sHash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 sHash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
// Gradient noise in [-1, 1]: no value-noise grid artefacts.
float sNoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 ga = sHash22(i) * 2.0 - 1.0;
  vec2 gb = sHash22(i + vec2(1.0, 0.0)) * 2.0 - 1.0;
  vec2 gc = sHash22(i + vec2(0.0, 1.0)) * 2.0 - 1.0;
  vec2 gd = sHash22(i + vec2(1.0, 1.0)) * 2.0 - 1.0;
  float a = dot(ga, f); float b = dot(gb, f - vec2(1.0, 0.0));
  float c = dot(gc, f - vec2(0.0, 1.0)); float d = dot(gd, f - vec2(1.0, 1.0));
  return 1.7 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// Divergence-free 2D flow from the gradient of noise.
vec2 sCurl(vec2 p){
  const float e = 0.08;
  float a = sNoise(p + vec2(0.0, e)) - sNoise(p - vec2(0.0, e));
  float b = sNoise(p + vec2(e, 0.0)) - sNoise(p - vec2(e, 0.0));
  return vec2(a, -b) / (2.0 * e);
}
// The one energy function: how disturbed the material is at a point. a is in
// aspect space (x * aspect, y), wake is the wake texel there. Every visual
// layer reads this, so nothing appears or vanishes on its own schedule.
float sEnergy(vec2 a, vec2 pointerA, float radius, float presence, vec4 wake){
  vec2 d = a - pointerA;
  float f = exp(-dot(d, d) / (radius * radius)) * presence;
  return smoothstep(0.02, 0.62, f * 0.85 + wake.z * 1.5 + wake.w * 0.15);
}
// Fitted ACES filmic curve (Narkowicz), then sRGB.
vec3 sAces(vec3 c){ return clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0); }
vec3 sSrgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 sTonemap(vec3 c){ return sSrgb(sAces(c)); }
// The same curve on the brightest channel only: saturated colours keep their
// hue (per-channel ACES turns deep reds orange), highlights still roll off.
vec3 sTonemapHue(vec3 c){
  float peak = max(max(c.r, c.g), max(c.b, 1e-5));
  vec3 kept = c * (sAces(vec3(peak)).r / peak);
  return sSrgb(mix(kept, sAces(c), 0.2));
}
// Film grain plus triangular dither: breaks banding in dark gradients.
vec3 sGrain(vec3 c, vec2 fragCoord, float t, float amount){
  float n = sHash12(fragCoord + fract(t * 7.13) * 91.7) + sHash12(fragCoord * 1.37 + fract(t * 3.71) * 47.3) - 1.0;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return c + n * (amount * (0.35 + 0.65 * (1.0 - lum)) + 1.0 / 255.0);
}
`;

const FULLSCREEN_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// The wake: velocity (xy, aspect units per 60 fps frame), speed-weighted
// footprint (z, drives energy) and plain footprint (w, dwell or pressure).
const WAKE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform float uAspect;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform vec2 uVel;
uniform float uRadius;
uniform float uPresence;
uniform float uDt;
uniform vec4 uDecay;
uniform vec2 uBurstAt;
uniform float uBurst;
uniform float uBurstAge;
void main(){
  vec4 c0 = texture(uPrev, vUv);
  // advect by itself, then a light blur so the flow spreads like air
  vec2 back = vUv - c0.xy * vec2(1.0 / uAspect, 1.0) * uDt;
  vec4 c = texture(uPrev, back) * 0.52
    + 0.12 * (texture(uPrev, back + vec2(uTexel.x, 0.0)) + texture(uPrev, back - vec2(uTexel.x, 0.0))
            + texture(uPrev, back + vec2(0.0, uTexel.y)) + texture(uPrev, back - vec2(0.0, uTexel.y)));
  // paint along the segment the pointer moved this frame, so fast strokes stay continuous
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  vec2 a = vec2(uFrom.x * uAspect, uFrom.y);
  vec2 b = vec2(uTo.x * uAspect, uTo.y);
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0);
  vec2 d = p - (a + ab * h);
  float r = uRadius * 0.7;
  float f = exp(-dot(d, d) / (r * r)) * uPresence;
  float sp = clamp(length(uVel) * 60.0, 0.0, 1.0);
  c.xy += (uVel - c.xy) * f * 0.45;
  c.z = max(c.z, f * sp);
  c.w = max(c.w, f);
  // a tap sends one expanding ring outward
  if (uBurst > 0.001) {
    vec2 q = p - vec2(uBurstAt.x * uAspect, uBurstAt.y);
    float rq = length(q);
    float front = 0.03 + uBurstAge * 0.75;
    float ring = exp(-pow((rq - front) / 0.06, 2.0)) * uBurst;
    c.xy += q / max(rq, 1e-4) * ring * 0.006 * uDt;
    c.z = max(c.z, ring * 0.9);
  }
  c *= uDecay;
  // a small dead zone lets the field reach exact zero, so the surface can rest
  c.xy = sign(c.xy) * max(abs(c.xy) - 1.5e-5 * uDt, 0.0);
  c.zw = max(c.zw - 0.0015 * uDt, 0.0);
  c.xy = clamp(c.xy, vec2(-0.08), vec2(0.08));
  o = c;
}
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StudioValue = number | boolean;
export type StudioParams = Record<string, StudioValue>;
/** Allowed range of a numeric parameter, or the default of a boolean one. */
export type StudioRange = { min: number; max: number; default: number } | { default: boolean };

/** Everything a material needs to simulate and draw one frame. */
export interface StudioFrame {
  /** Material time in seconds. Runs faster while the surface is stirred. */
  time: number;
  /** Step length in 60 fps frames (1 at 60 fps), clamped to [0.25, 3]. */
  dt: number;
  /** Smoothed pointer, uv with y up. */
  pointer: Vec2;
  /** Smoothed pointer velocity, aspect units (canvas heights) per 60 fps frame. */
  velocity: Vec2;
  /** 0..1 envelope: fast attack when the pointer arrives, slow release. */
  presence: number;
  /** 0..1, slower than presence: how stirred the surface is overall. */
  stir: number;
  /** 0..1 burst from the last tap, decaying. */
  burst: number;
  burstAt: Vec2;
  /** Seconds since the last tap. */
  burstAge: number;
  /** Pointer radius as a fraction of the canvas height (viewport scaled; larger on touch). */
  radius: number;
  /** True when the primary pointer is coarse (touch). */
  coarse: boolean;
  aspect: number;
  /** Drawing-buffer size in pixels. */
  width: number;
  height: number;
  params: Readonly<StudioParams>;
  /** Palette in linear RGB. */
  colors: readonly Vec3[];
  /** The page is in a light theme. */
  light: boolean;
  wake: WebGLTexture | null;
  wakeTexel: Vec2;
}

export interface StudioProgram {
  readonly program: WebGLProgram;
  use(): StudioProgram;
  /** Sets a uniform by name; the type comes from the shader. Unknown names are ignored. */
  set(name: string, value: number | boolean | ArrayLike<number>): StudioProgram;
  /** Binds a texture to a unit and points the sampler at it. */
  tex(name: string, texture: WebGLTexture | null, unit: number): StudioProgram;
  /** Sets the standard frame uniforms (uTime, uPointer, uWake on unit 7, ...). */
  frame(frame: StudioFrame): StudioProgram;
}

export interface StudioTarget {
  textures: WebGLTexture[];
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
  /** Binds the framebuffer and sets the viewport. */
  bind(): void;
  clear(r?: number, g?: number, b?: number, a?: number): void;
}

export interface StudioPingPong {
  readonly read: StudioTarget;
  readonly write: StudioTarget;
  swap(): void;
  clear(r?: number, g?: number, b?: number, a?: number): void;
}

export interface TargetOptions {
  /** "full" asks for RGBA32F and falls back to RGBA16F; "half" is RGBA16F. */
  precision?: "full" | "half" | "byte";
  filter?: "linear" | "nearest";
  /** Number of colour attachments (multiple render targets). */
  attachments?: number;
}

/** GL helpers handed to a material. Every resource made here is freed by the core. */
export interface StudioGL {
  gl: WebGL2RenderingContext;
  lowPower: boolean;
  coarse: boolean;
  /** RGBA32F targets are available (else "full" precision falls back to RGBA16F). */
  fullFloat: boolean;
  program(fragment: string, vertex?: string): StudioProgram;
  target(width: number, height: number, options?: TargetOptions): StudioTarget;
  pingPong(width: number, height: number, options?: TargetOptions): StudioPingPong;
  buffer(): WebGLBuffer;
  vertexArray(): WebGLVertexArrayObject;
  texture(): WebGLTexture;
  /** Draws a full-screen triangle (attribute 0). */
  fullscreen(): void;
}

export interface StudioInstance {
  /** The drawing buffer changed size. */
  resize?(frame: StudioFrame): void;
  /** Advances the simulation one step. */
  step(frame: StudioFrame): void;
  /** Draws to the default framebuffer. */
  draw(frame: StudioFrame): void;
  /** The surface came to rest: clear simulation state so the resting frame is exact. */
  rest?(): void;
}

export interface StudioMaterial {
  /** 60 fps frames the material needs, after the last input, to come to rest. */
  settleFrames: number;
  /** Ask for an antialiased and/or depth-buffered default framebuffer. */
  antialias?: boolean;
  depth?: boolean;
  /** Scripted stroke for the intro and still frames: t in [0, 1] to uv (y up). */
  ghost?: { seconds: number; path(t: number): Vec2 };
  /** Fraction of the ghost stroke shown in still frames (cards, reduced motion). */
  stillAt?: number;
  /**
   * Long settles: after this many frames without input the material keeps
   * settling at `calmFps` (default 20) instead of the display rate.
   */
  calmAfter?: number;
  calmFps?: number;
  /** The material's GLSL passes by name, for reference and documentation. */
  glsl?: Record<string, string>;
  create(studio: StudioGL): StudioInstance;
}

export interface StudioOptions {
  params?: StudioParams;
  /** Ranges used to clamp params (props are untrusted). */
  ranges?: Record<string, StudioRange>;
  /** Palette as "#rrggbb". */
  colors?: readonly string[];
  light?: boolean;
  /** Upper bound for devicePixelRatio (default 1.5). */
  maxDpr?: number;
  /** Upper bound for drawing-buffer pixels (default 2.4 M, 1.2 M on low power). */
  maxPixels?: number;
  /** Force the low-power path; detected from the device when left out. */
  lowPower?: boolean;
  /** Force reduced motion; follows prefers-reduced-motion when left out. */
  reducedMotion?: boolean;
  /** Element that receives pointer events (default: the canvas's parent). */
  eventTarget?: HTMLElement;
  /** React to the pointer (default true). */
  interactive?: boolean;
  /** Play the scripted stroke once when the surface first becomes visible. */
  intro?: boolean;
  /** Render one still frame and stop (cards, snapshots). */
  still?: boolean;
  /** Keep the drawing buffer (needed to copy a still frame elsewhere). */
  preserveDrawingBuffer?: boolean;
  /** CSS size to render at, for a canvas that is not in the document (stills). */
  size?: { width: number; height: number };
  onReady?: () => void;
  onError?: (reason: string) => void;
}

export interface StudioHandle {
  set(params: StudioParams): void;
  setColors(colors: readonly string[], light: boolean): void;
  pause(): void;
  play(): void;
  destroy(): void;
}

/** A numeric param of the frame, or the fallback. */
export function param(frame: StudioFrame, key: string, fallback: number): number {
  const value = frame.params[key];
  return typeof value === "number" ? value : fallback;
}

/** A simulation grid `base` texels along the longer side, following the canvas shape. */
export function gridSize(aspect: number, base: number): Vec2 {
  return aspect >= 1
    ? [base, Math.max(16, Math.round(base / aspect))]
    : [Math.max(16, Math.round(base * aspect)), base];
}

/** Clamps untrusted params to their ranges; unknown keys are dropped when ranges are given. */
export function clampParams(
  params: StudioParams,
  ranges: Record<string, StudioRange> | undefined,
): StudioParams {
  if (!ranges) return { ...params };
  const out: StudioParams = {};
  for (const [key, range] of Object.entries(ranges)) {
    const value = params[key];
    if ("min" in range) {
      out[key] =
        typeof value === "number" && Number.isFinite(value)
          ? clampNumber(value, range.min, range.max)
          : range.default;
    } else {
      out[key] = typeof value === "boolean" ? value : range.default;
    }
  }
  return out;
}

function detectLowPower(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  return (
    nav.connection?.saveData === true ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
    (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4)
  );
}

function defaultGhost(t: number): Vec2 {
  const e = t * t * (3 - 2 * t);
  return [0.26 + 0.5 * e, 0.44 + 0.1 * Math.sin(t * Math.PI * 1.2)];
}

// ---------------------------------------------------------------------------
// GL helpers
// ---------------------------------------------------------------------------

interface Resources {
  textures: WebGLTexture[];
  framebuffers: WebGLFramebuffer[];
  programs: WebGLProgram[];
  buffers: WebGLBuffer[];
  vaos: WebGLVertexArrayObject[];
}

function createStudioGL(
  gl: WebGL2RenderingContext,
  lowPower: boolean,
  coarse: boolean,
  res: Resources,
): StudioGL {
  const colorFloat = gl.getExtension("EXT_color_buffer_float");
  const halfFloat = colorFloat ?? gl.getExtension("EXT_color_buffer_half_float");
  if (!halfFloat) throw new Error("float-targets");
  const floatLinear = gl.getExtension("OES_texture_float_linear");
  let fullFloat = !!colorFloat && !!floatLinear;

  // One full-screen triangle, shared by every pass.
  const tri = gl.createBuffer();
  const triVao = gl.createVertexArray();
  if (!tri || !triVao) throw new Error("buffers");
  res.buffers.push(tri);
  res.vaos.push(triVao);
  gl.bindVertexArray(triVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const compile = (type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
      const log = gl.getShaderInfoLog(shader) ?? "";
      gl.deleteShader(shader);
      throw new Error("compile: " + log);
    }
    return shader;
  };

  const program = (fragment: string, vertex = FULLSCREEN_VS): StudioProgram => {
    const p = gl.createProgram();
    if (!p) throw new Error("program");
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, "aPos");
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
      throw new Error("link: " + (gl.getProgramInfoLog(p) ?? ""));
    }
    res.programs.push(p);
    const uniforms = new Map<string, { location: WebGLUniformLocation; type: number }>();
    const count = (gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number) || 0;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(p, i);
      if (!info) continue;
      const name = info.name.replace(/\[0\]$/, "");
      const location = gl.getUniformLocation(p, info.name);
      if (location) uniforms.set(name, { location, type: info.type });
    }
    const handle: StudioProgram = {
      program: p,
      use() {
        gl.useProgram(p);
        return handle;
      },
      set(name, value) {
        const u = uniforms.get(name);
        if (!u) return handle;
        const v =
          typeof value === "number" ? [value] : typeof value === "boolean" ? [+value] : value;
        const a = (i: number): number => v[i] ?? 0;
        switch (u.type) {
          case gl.FLOAT:
            gl.uniform1f(u.location, a(0));
            break;
          case gl.FLOAT_VEC2:
            gl.uniform2f(u.location, a(0), a(1));
            break;
          case gl.FLOAT_VEC3:
            if (v.length > 3) gl.uniform3fv(u.location, Float32Array.from(v));
            else gl.uniform3f(u.location, a(0), a(1), a(2));
            break;
          case gl.FLOAT_VEC4:
            gl.uniform4f(u.location, a(0), a(1), a(2), a(3));
            break;
          case gl.FLOAT_MAT4:
            gl.uniformMatrix4fv(u.location, false, Float32Array.from(v));
            break;
          case gl.INT_VEC2:
            gl.uniform2i(u.location, Math.round(a(0)), Math.round(a(1)));
            break;
          case gl.INT_VEC3:
            gl.uniform3i(u.location, Math.round(a(0)), Math.round(a(1)), Math.round(a(2)));
            break;
          default:
            gl.uniform1i(u.location, Math.round(a(0)));
        }
        return handle;
      },
      tex(name, texture, unit) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return handle.set(name, unit);
      },
      frame(f) {
        handle
          .set("uTime", f.time)
          .set("uDt", f.dt)
          .set("uPointer", f.pointer)
          .set("uPointerA", [f.pointer[0] * f.aspect, f.pointer[1]])
          .set("uVel", f.velocity)
          .set("uPresence", f.presence)
          .set("uStir", f.stir)
          .set("uBurst", f.burst)
          .set("uBurstAt", f.burstAt)
          .set("uBurstAge", f.burstAge)
          .set("uRadius", f.radius)
          .set("uAspect", f.aspect)
          .set("uRes", [f.width, f.height])
          .set("uLight", f.light)
          .set("uWakeTexel", f.wakeTexel);
        if (uniforms.has("uWake")) handle.tex("uWake", f.wake, 7);
        return handle;
      },
    };
    return handle;
  };

  const makeTexture = (
    width: number,
    height: number,
    precision: "full" | "half" | "byte",
    filter: number,
  ): WebGLTexture => {
    const t = gl.createTexture();
    if (!t) throw new Error("texture");
    res.textures.push(t);
    gl.bindTexture(gl.TEXTURE_2D, t);
    if (precision === "byte") {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    } else if (precision === "full" && fullFloat) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };

  const target = (width: number, height: number, options: TargetOptions = {}): StudioTarget => {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    const precision = options.precision ?? "half";
    const filter = options.filter === "nearest" ? gl.NEAREST : gl.LINEAR;
    const count = Math.max(1, options.attachments ?? 1);
    const fb = gl.createFramebuffer();
    if (!fb) throw new Error("framebuffer");
    res.framebuffers.push(fb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    const textures: WebGLTexture[] = [];
    const drawBuffers: number[] = [];
    for (let i = 0; i < count; i++) {
      const t = makeTexture(w, h, precision, filter);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0);
      textures.push(t);
      drawBuffers.push(gl.COLOR_ATTACHMENT0 + i);
    }
    gl.drawBuffers(drawBuffers);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      if (precision === "full" && fullFloat) {
        // Some drivers list RGBA32F but cannot render to it: fall back to RGBA16F.
        fullFloat = false;
        return target(width, height, options);
      }
      throw new Error("framebuffer-incomplete");
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const t: StudioTarget = {
      textures,
      framebuffer: fb,
      width: w,
      height: h,
      bind() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.viewport(0, 0, w, h);
      },
      clear(r = 0, g = 0, b = 0, a = 0) {
        t.bind();
        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT);
      },
    };
    return t;
  };

  const pingPong = (width: number, height: number, options?: TargetOptions): StudioPingPong => {
    let a = target(width, height, options);
    let b = target(width, height, options);
    return {
      get read() {
        return a;
      },
      get write() {
        return b;
      },
      swap() {
        const t = a;
        a = b;
        b = t;
      },
      clear(r, g, bl, al) {
        a.clear(r, g, bl, al);
        b.clear(r, g, bl, al);
      },
    };
  };

  return {
    gl,
    lowPower,
    coarse,
    get fullFloat() {
      return fullFloat;
    },
    program,
    target,
    pingPong,
    buffer() {
      const b = gl.createBuffer();
      if (!b) throw new Error("buffer");
      res.buffers.push(b);
      return b;
    },
    vertexArray() {
      const v = gl.createVertexArray();
      if (!v) throw new Error("vao");
      res.vaos.push(v);
      return v;
    },
    texture() {
      const t = gl.createTexture();
      if (!t) throw new Error("texture");
      res.textures.push(t);
      return t;
    },
    fullscreen() {
      gl.bindVertexArray(triVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

// ---------------------------------------------------------------------------
// The surface
// ---------------------------------------------------------------------------

/**
 * Contexts are released a tick after destroy, so a canvas that is mounted
 * again straight away (React StrictMode, fast remounts) keeps a live context.
 */
const pendingRelease = new WeakMap<HTMLCanvasElement, ReturnType<typeof setTimeout>>();

/** Frames of a still: the material runs this many 60 fps steps of its ghost stroke first. */
const STILL_STEPS = 150;
const TOUCH_RELEASE_MS = 260;

/**
 * Mounts a material on a canvas. The canvas should fill its parent; the
 * parent receives pointer events (or pass `eventTarget`).
 */
export function mountStudio(
  canvas: HTMLCanvasElement,
  material: StudioMaterial,
  options: StudioOptions = {},
): StudioHandle {
  const lowPower = options.lowPower ?? detectLowPower();
  const coarseQuery =
    typeof matchMedia === "function" ? matchMedia("(hover: none), (pointer: coarse)") : null;
  const motionQuery =
    typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  const reduced = (): boolean => options.reducedMotion ?? motionQuery?.matches ?? false;
  const still = options.still === true;
  const interactive = options.interactive !== false && !still;
  const maxDpr = clampNumber(options.maxDpr ?? 1.5, 0.5, 3);
  const maxPixels = clampNumber(options.maxPixels ?? (lowPower ? 1.2e6 : 2.4e6), 1e5, 1.6e7);
  const eventTarget = options.eventTarget ?? canvas.parentElement ?? canvas;
  const release = pendingRelease.get(canvas);
  if (release !== undefined) {
    clearTimeout(release);
    pendingRelease.delete(canvas);
  }

  let params = clampParams(options.params ?? {}, options.ranges);
  let colors = (options.colors ?? []).map(hexToLinear);
  let light = options.light ?? false;

  let gl: WebGL2RenderingContext | null = null;
  let studio: StudioGL | null = null;
  let instance: StudioInstance | null = null;
  let wake: StudioPingPong | null = null;
  let wakeProgram: StudioProgram | null = null;
  let res: Resources = { textures: [], framebuffers: [], programs: [], buffers: [], vaos: [] };

  // Input state. Positions are uv with y up.
  const target: Vec2 = [0.5, 0.5];
  const pointer: Vec2 = [0.5, 0.5];
  const previous: Vec2 = [0.5, 0.5];
  const velocity: Vec2 = [0, 0];
  let hasPointer = false;
  let presence = 0;
  let presenceTarget = 0;
  let stir = 0;
  let burst = 0;
  let burstAt: Vec2 = [0.5, 0.5];
  let burstStart = -1e9;
  let touchRelease = 0;
  let restingFrames = 0;
  let ghostStart = -1;
  let introPlayed = false;

  // Loop state.
  let time = 0;
  let clock = 0;
  let raf = 0;
  let running = false;
  let last = 0;
  let pendingMs = 0;
  let settle = 0;
  let settled = true;
  let visible = false;
  let pageVisible = typeof document === "undefined" || !document.hidden;
  let paused = false;
  let destroyed = false;
  let lost = false;
  let ready = false;

  // Size and quality.
  let cssW = 1;
  let cssH = 1;
  let renderScale = 1;
  let slowFrames = 0;
  let fastFrames = 0;
  let frameEma = 16.7;

  const frameState = (dt: number): StudioFrame => {
    const aspect = canvas.width / Math.max(1, canvas.height);
    const coarse = coarseQuery?.matches ?? false;
    // Radius scales with the viewport: a thumb on a phone covers more of it.
    const radiusPx = clampNumber(Math.sqrt(cssW * cssH) * 0.16, 56, 220) * (coarse ? 1.3 : 1);
    return {
      time,
      dt,
      pointer: [pointer[0], pointer[1]],
      velocity: [velocity[0], velocity[1]],
      presence,
      stir,
      burst,
      burstAt: [burstAt[0], burstAt[1]],
      burstAge: Math.max(0, (clock - burstStart) / 1000),
      radius: radiusPx / Math.max(1, cssH),
      coarse,
      aspect,
      width: canvas.width,
      height: canvas.height,
      params,
      colors,
      light,
      wake: wake?.read.textures[0] ?? null,
      wakeTexel: wake ? [1 / wake.read.width, 1 / wake.read.height] : [0, 0],
    };
  };

  const wakeSize = (): Vec2 => {
    const aspect = cssW / Math.max(1, cssH);
    const base = lowPower ? 128 : 192;
    const w = aspect >= 1 ? base : Math.round(base * aspect);
    const h = aspect >= 1 ? Math.round(base / aspect) : base;
    return [Math.max(32, w), Math.max(32, h)];
  };

  const init = (): boolean => {
    try {
      const context = canvas.getContext("webgl2", {
        alpha: false,
        antialias: material.antialias ?? false,
        depth: material.depth ?? false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: options.preserveDrawingBuffer ?? still,
        powerPreference: "high-performance",
      });
      if (!context) throw new Error("webgl2");
      gl = context;
      res = { textures: [], framebuffers: [], programs: [], buffers: [], vaos: [] };
      studio = createStudioGL(context, lowPower, coarseQuery?.matches ?? false, res);
      wakeProgram = studio.program(WAKE_FS);
      const [ww, wh] = wakeSize();
      wake = studio.pingPong(ww, wh, { precision: "half" });
      wake.clear();
      instance = material.create(studio);
      ready = true;
      return true;
    } catch (error) {
      ready = false;
      freeResources();
      options.onError?.(error instanceof Error ? error.message : "init");
      return false;
    }
  };

  const freeResources = (): void => {
    if (!gl || gl.isContextLost()) return;
    for (const t of res.textures) gl.deleteTexture(t);
    for (const f of res.framebuffers) gl.deleteFramebuffer(f);
    for (const p of res.programs) gl.deleteProgram(p);
    for (const b of res.buffers) gl.deleteBuffer(b);
    for (const v of res.vaos) gl.deleteVertexArray(v);
    res = { textures: [], framebuffers: [], programs: [], buffers: [], vaos: [] };
  };

  const resize = (): boolean => {
    const rect = options.size ?? canvas.getBoundingClientRect();
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    const dpr = typeof devicePixelRatio === "number" ? devicePixelRatio : 1;
    let scale = Math.min(dpr, maxDpr) * renderScale;
    if (cssW * cssH * scale * scale > maxPixels) scale = Math.sqrt(maxPixels / (cssW * cssH));
    scale = Math.max(0.5, scale);
    const w = Math.max(1, Math.round(cssW * scale));
    const h = Math.max(1, Math.round(cssH * scale));
    if (canvas.width === w && canvas.height === h) return false;
    canvas.width = w;
    canvas.height = h;
    if (studio && wake) {
      const [ww, wh] = wakeSize();
      if (Math.abs(ww - wake.read.width) > 2 || Math.abs(wh - wake.read.height) > 2) {
        wake = studio.pingPong(ww, wh, { precision: "half" });
        wake.clear();
      }
    }
    instance?.resize?.(frameState(1));
    return true;
  };

  const stepWake = (dt: number, from: Vec2): void => {
    if (!gl || !wake || !wakeProgram || !studio) return;
    const f = frameState(dt);
    wake.write.bind();
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    wakeProgram
      .use()
      .tex("uPrev", wake.read.textures[0] ?? null, 0)
      .set("uTexel", [1 / wake.read.width, 1 / wake.read.height])
      .set("uAspect", f.aspect)
      .set("uFrom", from)
      .set("uTo", pointer)
      .set("uVel", velocity)
      .set("uRadius", f.radius)
      .set("uPresence", presence)
      .set("uDt", dt)
      .set("uDecay", [
        Math.pow(0.962, dt),
        Math.pow(0.962, dt),
        Math.pow(0.95, dt),
        Math.pow(0.93, dt),
      ])
      .set("uBurstAt", burstAt)
      .set("uBurst", burst)
      .set("uBurstAge", f.burstAge);
    studio.fullscreen();
    wake.swap();
  };

  /** Advances input envelopes by dt frames. Returns whether anything is still moving. */
  const advanceInput = (dt: number, now: number): void => {
    if (touchRelease && now > touchRelease) {
      presenceTarget = 0;
      touchRelease = 0;
    }
    // Scripted stroke (intro, stills): drives the pointer until it ends or a real pointer arrives.
    if (ghostStart >= 0) {
      const ghost = material.ghost ?? { seconds: 2.4, path: defaultGhost };
      const t = (now - ghostStart) / (ghost.seconds * 1000);
      if (t >= 1) {
        ghostStart = -1;
        presenceTarget = 0;
      } else {
        const p = ghost.path(Math.max(0, t));
        target[0] = p[0];
        target[1] = p[1];
        presenceTarget = 1;
      }
    }
    // Frame-rate independent easing toward the target.
    const ease = 1 - Math.pow(1 - 0.24, dt);
    pointer[0] += (target[0] - pointer[0]) * ease;
    pointer[1] += (target[1] - pointer[1]) * ease;
    const aspect = cssW / Math.max(1, cssH);
    // Velocity in canvas heights per frame: clamp first, then smooth.
    let vx = ((pointer[0] - previous[0]) * aspect) / dt;
    let vy = (pointer[1] - previous[1]) / dt;
    const speed = Math.hypot(vx, vy);
    const maxSpeed = 0.05;
    if (speed > maxSpeed) {
      vx *= maxSpeed / speed;
      vy *= maxSpeed / speed;
    }
    const smooth = 1 - Math.pow(0.5, dt);
    velocity[0] += (vx - velocity[0]) * smooth;
    velocity[1] += (vy - velocity[1]) * smooth;
    // Presence: fast attack, slow release.
    const pk = presenceTarget > presence ? 0.14 : 0.032;
    presence += (presenceTarget - presence) * (1 - Math.pow(1 - pk, dt));
    if (presenceTarget === 0 && presence < 0.002) presence = 0;
    // Stir: slower on both sides; it speeds up material time.
    const moving = Math.min(1, Math.hypot(velocity[0], velocity[1]) * 40) * presence;
    const sk = moving > stir ? 0.06 : 0.016;
    stir += (moving - stir) * (1 - Math.pow(1 - sk, dt));
    if (stir < 0.001 && presence === 0) stir = 0;
    burst = Math.max(0, burst - 0.022 * dt);
    restingFrames = speed < 1e-4 && burst === 0 ? restingFrames + dt : 0;
  };

  const draw = (dt: number): void => {
    if (!gl || !instance || lost) return;
    const f = frameState(dt);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    instance.draw(f);
  };

  const simulate = (dt: number, now: number): void => {
    const from: Vec2 = [pointer[0], pointer[1]];
    advanceInput(dt, now);
    previous[0] = pointer[0];
    previous[1] = pointer[1];
    // The material's clock speeds up while it is being stirred.
    time += (dt / 60) * (1 + stir * 1.4);
    stepWake(dt, from);
    instance?.step(frameState(dt));
  };

  const frame = (now: number): void => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const elapsed = now - last;
    last = now;
    clock = now;
    // A pointer that rests over the surface needs far fewer frames.
    const calm = material.calmAfter !== undefined && settle > material.calmAfter;
    const ambient = (presence > 0.98 && restingFrames > 90 && ghostStart < 0) || calm;
    const minMs = calm ? 1000 / clampNumber(material.calmFps ?? 20, 5, 60) : 32;
    pendingMs += elapsed;
    if (ambient && pendingMs < minMs) return;
    const dt = clampNumber(pendingMs / 16.6667, 0.25, 3);
    pendingMs = 0;

    // Adaptive resolution: step down when frames run long, back up with headroom.
    if (!ambient) {
      frameEma += (elapsed - frameEma) * 0.08;
      if (frameEma > 24) {
        slowFrames++;
        fastFrames = 0;
      } else if (frameEma < 15) {
        fastFrames++;
        slowFrames = 0;
      }
      if (slowFrames > 45 && renderScale > 0.6) {
        renderScale = Math.max(0.6, renderScale - 0.15);
        slowFrames = 0;
        resize();
      } else if (fastFrames > 360 && renderScale < 1) {
        renderScale = Math.min(1, renderScale + 0.1);
        fastFrames = 0;
        resize();
      }
    }

    simulate(dt, now);
    const interacting = presence > 0.002 || burst > 0.001 || ghostStart >= 0;
    // Settling is counted in simulated frames, so slow devices never cut a return short.
    settle = interacting ? 0 : settle + dt;
    if (settle > material.settleFrames) {
      wake?.clear();
      instance?.rest?.();
      settled = true;
      draw(1);
      stop();
      return;
    }
    draw(dt);
  };

  const start = (): void => {
    if (running || !ready || !visible || !pageVisible || paused || destroyed || lost) return;
    if (reduced() || still) return;
    running = true;
    settled = false;
    last = performance.now();
    pendingMs = 16.7;
    raf = requestAnimationFrame(frame);
  };

  const stop = (): void => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const wakeUp = (): void => {
    settle = 0;
    if (!running) start();
  };

  /** Runs the scripted stroke offline, then draws one frame: stills and reduced motion. */
  const renderStill = (): void => {
    if (!ready || !instance) return;
    wake?.clear();
    instance.rest?.();
    time = 0;
    presence = 0;
    presenceTarget = 0;
    stir = 0;
    burst = 0;
    const ghost = material.ghost ?? { seconds: 2.4, path: defaultGhost };
    const steps = Math.round(STILL_STEPS * clampNumber(material.stillAt ?? 0.7, 0.05, 1));
    const start0 = 0;
    const p0 = ghost.path(0);
    pointer[0] = previous[0] = target[0] = p0[0];
    pointer[1] = previous[1] = target[1] = p0[1];
    ghostStart = start0;
    const msPerStep = (ghost.seconds * 1000) / STILL_STEPS;
    for (let i = 0; i < steps; i++) simulate(1, start0 + i * msPerStep);
    ghostStart = -1;
    draw(1);
  };

  const showFirstFrame = (): void => {
    if (!ready) return;
    resize();
    if (still || reduced()) renderStill();
    else draw(1);
    options.onReady?.();
    options.onReady = undefined;
  };

  // --- events -------------------------------------------------------------

  const toUv = (event: PointerEvent): Vec2 => {
    const rect = canvas.getBoundingClientRect();
    return [
      (event.clientX - rect.left) / Math.max(1, rect.width),
      1 - (event.clientY - rect.top) / Math.max(1, rect.height),
    ];
  };

  const onMove = (event: PointerEvent): void => {
    if (lost || reduced()) return;
    const touch = event.pointerType === "touch";
    if (touch && event.buttons === 0 && event.pressure === 0) return;
    const [x, y] = toUv(event);
    ghostStart = -1;
    if (!hasPointer) {
      pointer[0] = previous[0] = x;
      pointer[1] = previous[1] = y;
      hasPointer = true;
    }
    target[0] = x;
    target[1] = y;
    presenceTarget = 1;
    touchRelease = 0;
    wakeUp();
  };

  const onDown = (event: PointerEvent): void => {
    if (lost || reduced()) return;
    const [x, y] = toUv(event);
    ghostStart = -1;
    // A touch lands where it lands: no easing in from the last position.
    if (!hasPointer || event.pointerType === "touch") {
      pointer[0] = previous[0] = target[0] = x;
      pointer[1] = previous[1] = target[1] = y;
      hasPointer = true;
    }
    target[0] = x;
    target[1] = y;
    presenceTarget = 1;
    touchRelease = 0;
    burst = 1;
    burstAt = [x, y];
    burstStart = performance.now();
    wakeUp();
  };

  const onUp = (event: PointerEvent): void => {
    if (event.pointerType === "touch") {
      // A short release delay so a lifted finger still finishes its gesture.
      touchRelease = performance.now() + TOUCH_RELEASE_MS;
      hasPointer = false;
    }
    wakeUp();
  };

  const onLeave = (event: PointerEvent): void => {
    if (event.pointerType === "touch") {
      touchRelease = performance.now() + TOUCH_RELEASE_MS;
    } else {
      presenceTarget = 0;
    }
    hasPointer = false;
    wakeUp();
  };

  const onLost = (event: Event): void => {
    event.preventDefault();
    lost = true;
    ready = false;
    stop();
    instance = null;
    wake = null;
    wakeProgram = null;
    studio = null;
  };

  const onRestored = (): void => {
    lost = false;
    if (destroyed) return;
    if (init()) {
      resize();
      if (still || reduced()) renderStill();
      else draw(1);
      if (!settled) start();
    }
  };

  const onVisibility = (): void => {
    pageVisible = !document.hidden;
    if (pageVisible) {
      if (!settled) start();
    } else {
      stop();
    }
  };

  const onMotionChange = (): void => {
    if (reduced()) {
      stop();
      presenceTarget = 0;
      renderStill();
    } else {
      settled = false;
      start();
    }
  };

  const sizing =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          if (!ready) return;
          if (resize()) {
            if (still || reduced()) renderStill();
            else draw(1);
          }
        })
      : null;

  const visibility =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver((entries) => {
          for (const entry of entries) visible = entry.isIntersecting;
          if (!visible) {
            stop();
            return;
          }
          if (!introPlayed && !still && !reduced() && options.intro !== false && interactive) {
            introPlayed = true;
            const ghost = material.ghost ?? { seconds: 2.4, path: defaultGhost };
            const p0 = ghost.path(0);
            pointer[0] = previous[0] = target[0] = p0[0];
            pointer[1] = previous[1] = target[1] = p0[1];
            ghostStart = performance.now();
            settled = false;
          }
          if (!settled) start();
        })
      : null;

  // --- start ----------------------------------------------------------------

  if (init()) {
    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);
    if (interactive) {
      // Vertical drags still scroll the page; everything else reaches the surface.
      if (!eventTarget.style.touchAction) eventTarget.style.touchAction = "pan-y";
      eventTarget.addEventListener("pointermove", onMove, { passive: true });
      eventTarget.addEventListener("pointerdown", onDown, { passive: true });
      eventTarget.addEventListener("pointerup", onUp, { passive: true });
      eventTarget.addEventListener("pointercancel", onUp, { passive: true });
      eventTarget.addEventListener("pointerleave", onLeave, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);
    motionQuery?.addEventListener("change", onMotionChange);
    sizing?.observe(canvas);
    showFirstFrame();
    if (visibility) visibility.observe(canvas);
    else {
      visible = true;
      start();
    }
  }

  return {
    set(next) {
      params = clampParams({ ...params, ...next }, options.ranges);
      if (!ready) return;
      if (still || reduced()) renderStill();
      else if (!running) draw(1);
    },
    setColors(next, isLight) {
      colors = next.map(hexToLinear);
      light = isLight;
      if (!ready) return;
      if (still || reduced()) renderStill();
      else if (!running) draw(1);
    },
    pause() {
      paused = true;
      stop();
    },
    play() {
      paused = false;
      if (!settled) start();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      sizing?.disconnect();
      visibility?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery?.removeEventListener("change", onMotionChange);
      eventTarget.removeEventListener("pointermove", onMove);
      eventTarget.removeEventListener("pointerdown", onDown);
      eventTarget.removeEventListener("pointerup", onUp);
      eventTarget.removeEventListener("pointercancel", onUp);
      eventTarget.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      freeResources();
      instance = null;
      const context = gl;
      gl = null;
      if (context && !context.isContextLost()) {
        pendingRelease.set(
          canvas,
          setTimeout(() => {
            pendingRelease.delete(canvas);
            if (!context.isContextLost()) context.getExtension("WEBGL_lose_context")?.loseContext();
          }, 0),
        );
      }
    },
  };
}
