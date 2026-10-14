/**
 * The landing hero's sculpture: a silk ribbon that sweeps in from the left,
 * curls once around an open centre and sweeps out to the right, its ends
 * fraying into sand. Everything is WebGL points:
 * - silk: three ribbons of fine fibres. Each fibre is a lane of points packed
 *   along the ribbon, lit with a hair model (highlights run along the strand);
 * - sand: grains clinging to the ribbon edges, thickest where the ends fray;
 * - dust drifting off the ends, and a few glossy pearls.
 * Every point is placed analytically in the vertex shader from a random seed,
 * so the CPU uploads one buffer once. Under the pointer the form comes apart
 * into a vortex of loose particles that keeps turning while the pointer
 * rests, and flows back into shape when it leaves.
 *
 * Site-only code (not part of the shader catalog or the exported runtime).
 * Colours, in order: page, shadow tone, accent, highlight.
 */

export interface SculptureOptions {
  colors: readonly string[];
  /** Upper bound for devicePixelRatio. */
  maxDpr: number;
  /** Points to draw at full quality. */
  count: number;
  /** Time in seconds of the frame drawn for reduced motion. */
  stillTime: number;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export interface SculptureHandle {
  setColors(colors: readonly string[]): void;
  destroy(): void;
}

/** Kinds of point (the seed's first value). */
const SILK = [0, 1, 2] as const;
const SAND = 3;
const DUST = 4;
const PEARL = 5;
/** Fibre lanes per silk ribbon (broad, middle, narrow). */
const LANES = [30, 20, 12] as const;
const PEARLS = 26;

const VERTEX = /* glsl */ `
precision highp float;
attribute vec4 a_seed; // kind, along, across, random
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_activity;
uniform vec2 u_cursor;    // fast-following pointer, 0..1
uniform float u_presence; // 0..1: is the pointer over the hero
uniform float u_spin;     // seconds the vortex has been turning
uniform vec3 u_place;     // optional placement: centre (0..1) and unit in px; z = 0 uses the hero layout
uniform float u_arm;      // horizontal stretch of the two arms (1 = as designed); wide screens get longer arms
uniform float u_dpr;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
varying vec3 v_color;
varying float v_alpha;
varying float v_pearl;

const float PI = 3.14159265;
// How far (in curve parameter) each end runs past the curl.
const float REACH = 2.4;

mat2 turn(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

float pick(float r, float a, float b, float c) {
  return r < 0.5 ? a : (r < 1.5 ? b : c);
}

// Centre line of ribbon r. Inside |phi| <= PI it is a trochoid, which curls
// once around an open centre; past that it leaves horizontally at the top of
// the curl and sweeps down and outward as a gentle wave.
vec3 path(float phi, float r, float t) {
  float b = pick(r, 1.0, 0.88, 1.1) + 0.04 * sin(t * 0.4 + r * 2.0);
  float a = 0.17;
  float depth = pick(r, 0.42, -0.34, 0.2);
  float lift = pick(r, 0.0, 0.08, -0.07);
  float ap = abs(phi);
  vec3 c;
  if (ap <= PI) {
    c = vec3(a * phi - b * sin(phi), -b * cos(phi), depth * sin(phi) * (0.5 + 0.5 * cos(phi)));
  } else {
    float side = sign(phi);
    float beyond = ap - PI;
    float x = side * (a * PI + (a + b) * beyond * u_arm);
    float sweep = smoothstep(0.0, 1.8, beyond);
    c = vec3(x, b * mix(1.0, -0.1, sweep), 0.0);
    c.y += sweep * 0.12 * sin(x * 1.3 + t * 0.5 + r);
    c.z += sweep * 0.2 * cos(x * 1.1 - t * 0.4 + r * 1.7);
  }
  // Flatten a little: the curl reads better wider than tall.
  c.y = (c.y + lift - b * 0.12) * 0.84;
  return c;
}

void main() {
  float kind = a_seed.x;
  float along = a_seed.y;
  float across = a_seed.z;
  float rnd = a_seed.w;
  float rnd2 = fract(rnd * 7.31 + 0.13);
  float rnd3 = fract(rnd * 13.17 + 0.71);
  float t = u_time;
  bool silk = kind < 2.5;
  bool pearl = kind > 4.5;
  float ribbon = silk ? kind : floor(rnd2 * 2.999);
  if (pearl) ribbon = 0.0;

  float phi = (along * 2.0 - 1.0) * (PI + REACH);
  float ap = abs(phi);
  vec3 c = path(phi, ribbon, t);
  vec3 tangent = normalize(path(phi + 0.01, ribbon, t) - path(phi - 0.01, ribbon, t));
  vec3 sideways = normalize(cross(tangent, vec3(0.0, 0.0, 1.0)) + vec3(0.0, 0.0, 1e-4));
  vec3 up = cross(sideways, tangent);
  float twist = phi * pick(ribbon, 0.55, -0.7, 0.9) + t * 0.25 + ribbon * 1.3;
  vec3 across3 = sideways * cos(twist) + up * sin(twist);
  vec3 normal = cross(tangent, across3);
  float taper = 1.0 - 0.85 * smoothstep(PI + 0.6, PI + REACH, ap);
  float width = pick(ribbon, 0.42, 0.3, 0.2) * taper;
  float fray = smoothstep(PI + 1.3, PI + REACH, ap);

  vec3 p;
  float alpha = 1.0;
  float size;
  if (silk) {
    // A fibre: its lane across the ribbon, a slow wave, and a few stray
    // strands that arc away from the bundle.
    float laneRnd = fract(sin(across * 91.7 + kind * 17.0) * 43758.5);
    float wave = 0.05 * sin(phi * 2.5 + laneRnd * 20.0 + t * 0.6);
    float stray = laneRnd > 0.92 ? 0.45 * sin(phi * 1.6 + laneRnd * 40.0 + t * 0.3) : 0.0;
    p = c + across3 * (across + wave + stray) * width + normal * (rnd - 0.5) * 0.014;
    p += (vec3(rnd, rnd2, rnd3) - 0.5) * fray * (0.2 + 0.7 * rnd3);
    alpha = (0.75 + 0.25 * laneRnd) * (1.0 - fray * step(0.55, rnd3));
    size = mix(1.2, 1.8, rnd3);
  } else if (kind < 3.5) {
    // Sand clinging just past the ribbon edges, thickest where the ends fray.
    float edge = sign(across) * (1.0 + abs(across) * 0.9);
    p = c + across3 * edge * width + normal * (rnd - 0.5) * 0.18 * (0.3 + abs(across));
    p += (vec3(rnd, rnd2, rnd3) - 0.5) * (0.06 + fray * 0.8 * rnd3);
    size = mix(1.1, 2.8, rnd3 * rnd3 * rnd3);
    alpha = 0.95;
  } else if (!pearl) {
    // Loose dust drifting outward off both ends.
    float sideSign = rnd2 > 0.5 ? 1.0 : -1.0;
    float travel = fract(along + t * (0.012 + 0.02 * rnd3));
    float x = sideSign * (2.6 + travel * 2.4);
    p = vec3(x, -0.05 + 0.1 * sin(x * 1.3 + t * 0.5) + across * (0.1 + 0.08 * abs(x)), (rnd3 - 0.5) * 0.8);
    alpha = sin(travel * PI) * mix(0.3, 0.8, rnd);
    size = mix(0.9, 1.8, rnd3);
  } else {
    // Pearls resting along the curl.
    p = c + across3 * sign(across) * (1.1 + 0.4 * rnd) * width + normal * (rnd2 - 0.5) * 0.3;
    size = mix(4.0, 9.0, rnd3 * rnd3);
  }

  // A breath of motion on every point, so the form is never frozen.
  p += 0.006 * sin(vec3(1.7, 2.3, 1.3) * t + rnd * 40.0);

  // Slow sway, plus a little parallax towards the pointer.
  float yaw = 0.18 * sin(t * 0.13) + (u_pointer.x - 0.5) * 0.2;
  float pitch = -0.12 + (u_pointer.y - 0.5) * 0.12;
  p.xz = turn(yaw) * p.xz;
  p.yz = turn(pitch) * p.yz;
  tangent.xz = turn(yaw) * tangent.xz;
  tangent.yz = turn(pitch) * tangent.yz;
  normal.xz = turn(yaw) * normal.xz;
  normal.yz = turn(pitch) * normal.yz;

  // Screen placement: the form sits in the upper part of the hero.
  float aspect = u_resolution.x / u_resolution.y;
  vec2 centre = vec2(0.5, aspect < 1.0 ? 0.64 : 0.68) * u_resolution;
  float unit = min(u_resolution.y * 0.165, u_resolution.x * 0.27);
  if (u_place.z > 0.0) {
    centre = u_place.xy * u_resolution;
    unit = u_place.z;
  }
  const float focal = 4.5;

  // Under the pointer the form comes apart into a vortex: points near it are
  // drawn inward and swirl around it, faster towards the eye, and keep turning
  // for as long as the pointer rests there. Each point has its own radius and
  // speed, so the swirl reads as a tornado of loose particles. Moving the
  // pointer quickly adds a little extra scatter.
  vec2 cursor = (u_cursor * u_resolution - centre) / unit;
  float project = focal / (focal - p.z);
  vec2 rel = p.xy * project - cursor;
  float r = length(rel);
  float pull = u_presence * exp(-r * r * 2.2);
  float omega = (1.6 + 1.4 * rnd3) / (0.18 + r);
  float angle = pull * (u_spin * omega + 0.9);
  float inward = mix(1.0, 0.6 + 0.4 * rnd, pull);
  vec2 swirled = turn(-angle) * rel * inward;
  // Keep the eye open: nothing settles right on the pointer.
  float eye = 0.1 * pull * (0.6 + 0.8 * rnd2);
  float len = length(swirled);
  if (len < eye) swirled = swirled / max(len, 1e-4) * eye;
  swirled += (vec2(rnd, rnd2) - 0.5) * pull * (0.12 + 0.25 * u_activity);
  p.xy += (swirled - rel) / project;
  // The eye lifts towards the viewer, like a funnel.
  p.z += pull * (0.35 + 0.5 * rnd2) * (1.0 - smoothstep(0.0, 0.9, r));

  float depthScale = focal / (focal - p.z);
  vec2 screen = centre + p.xy * depthScale * unit;
  gl_Position = vec4(screen / u_resolution * 2.0 - 1.0, -p.z * 0.2, 1.0);
  gl_PointSize = size * u_dpr * depthScale * clamp(unit / 170.0, 0.8, 1.3);

  // Colour: champagne silk in the light, the shadow tone in the dark.
  bool light = dot(u_color1, vec3(0.299, 0.587, 0.114)) > 0.5;
  vec3 l = normalize(vec3(-0.45, 0.75, 0.55));
  vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
  vec3 shade = u_color2;
  vec3 glow = u_color4;
  vec3 col;
  if (silk) {
    // Kajiya-Kay: fibres are lit by their direction, not a surface normal.
    float tl = dot(tangent, l);
    float th = dot(tangent, h);
    float diffuse = sqrt(max(0.0, 1.0 - tl * tl));
    float spec = pow(sqrt(max(0.0, 1.0 - th * th)), 90.0);
    float facing = abs(dot(normal, l));
    col = mix(shade, glow, diffuse * (0.3 + 0.7 * facing));
    col += spec * mix(glow, vec3(1.0), 0.6) * (light ? 0.5 : 0.75);
    col *= 0.78 + 0.3 * fract(sin(across * 53.1 + kind) * 9631.7);
  } else {
    float lit = clamp(dot(normalize(normal + vec3(0.0, 0.0, 0.6)), l) * 0.5 + 0.5, 0.0, 1.0);
    col = mix(shade, glow, lit) * mix(0.55, 1.1, rnd);
  }
  if (pearl) col = mix(glow, vec3(1.0), 0.25);
  col = mix(col, mix(glow, vec3(1.0), 0.3), clamp(pull * 0.8, 0.0, 0.55));
  v_color = clamp(col, 0.0, 1.0);
  v_alpha = clamp(alpha, 0.0, 1.0);
  v_pearl = pearl ? 1.0 : 0.0;
}
`;

const FRAGMENT = /* glsl */ `
precision mediump float;
varying vec3 v_color;
varying float v_alpha;
varying float v_pearl;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r = dot(c, c);
  if (r > 1.0) discard;
  vec3 col = v_color;
  float a = v_alpha;
  if (v_pearl > 0.5) {
    // A small shaded sphere with one sharp highlight.
    vec3 n = vec3(c.x, -c.y, sqrt(1.0 - r));
    vec3 l = normalize(vec3(-0.45, 0.75, 0.55));
    float diffuse = max(dot(n, l), 0.0);
    float spec = pow(max(dot(n, normalize(l + vec3(0.0, 0.0, 1.0))), 0.0), 50.0);
    col = col * (0.22 + 0.85 * diffuse) + spec;
    a *= 1.0 - smoothstep(0.82, 1.0, r);
  } else {
    a *= 1.0 - smoothstep(0.4, 1.0, r);
  }
  if (a < 0.02) discard;
  gl_FragColor = vec4(col * a, a);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [0, 0, 0];
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * One vec4 seed per point: kind, position along the ribbon (0..1), position
 * across it (-1..1, a fibre lane for silk), random. About 80% silk, 13% sand,
 * 7% dust, plus the pearls. Shuffled, so drawing fewer points (the quality
 * governor) thins every kind evenly.
 */
function buildSeeds(count: number): Float32Array {
  // A small deterministic generator, so every visit draws the same form.
  let state = 0x9e3779b9;
  const random = (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  const seeds: number[][] = [];
  const silk = Math.round(count * 0.8);
  const sand = Math.round(count * 0.13);
  const dust = count - silk - sand - PEARLS;
  const lanesTotal = LANES[0] + LANES[1] + LANES[2];
  SILK.forEach((kind, index) => {
    const lanes = LANES[index]!;
    const share = Math.round((silk * lanes) / lanesTotal);
    for (let i = 0; i < share; i++) {
      const lane = ((Math.floor(random() * lanes) + 0.5) / lanes) * 2 - 1;
      seeds.push([kind, random(), lane, random()]);
    }
  });
  for (let i = 0; i < sand; i++) {
    // Half spread along the whole ribbon, half piled toward the fraying ends.
    const end = random() < 0.65;
    const toward = Math.pow(random(), 2.2) * 0.26;
    const along = end ? (random() < 0.5 ? toward : 1 - toward) : random();
    seeds.push([SAND, along, random() * 2 - 1, random()]);
  }
  for (let i = 0; i < dust; i++) {
    seeds.push([DUST, random(), (random() + random() + random() - 1.5) / 1.5, random()]);
  }
  for (let i = 0; i < PEARLS; i++) {
    // Pearls sit on the curl, not the long ends.
    seeds.push([PEARL, 0.3 + random() * 0.4, random() * 2 - 1, random()]);
  }
  for (let i = seeds.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [seeds[i], seeds[j]] = [seeds[j]!, seeds[i]!];
  }
  return new Float32Array(seeds.flat());
}

export function mountSculpture(
  canvas: HTMLCanvasElement,
  options: SculptureOptions,
): SculptureHandle {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = [0.5, 0.5];
  const pointerTarget = [0.5, 0.5];
  let colors = options.colors;
  let activity = 0;
  let activityTarget = 0;
  // The vortex: a pointer that follows quickly, whether it is over the hero,
  // and how long the swirl has been turning.
  const cursor = [0.5, 0.5];
  let presence = 0;
  let presenceTarget = 0;
  let spin = 0;
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let locations: Record<string, WebGLUniformLocation | null> = {};
  let drawCount = options.count;
  let quality = 1;
  let visible = false;
  let destroyed = false;
  let ready = false;
  let frameId = 0;
  let lastTick = 0;
  let time = 0;
  let average = 16.7;
  let slow = 0;

  const fail = (error: unknown): void => {
    program = null;
    options.onError?.(error instanceof Error ? error : new Error(String(error)));
  };

  const init = (): void => {
    try {
      const attributes: WebGLContextAttributes = {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: true,
        stencil: false,
      };
      gl = (canvas.getContext("webgl2", attributes) ?? canvas.getContext("webgl", attributes)) as
        WebGLRenderingContext | WebGL2RenderingContext | null;
      if (!gl) throw new Error("WebGL is not available");
      const compile = (type: number, source: string): WebGLShader => {
        const shader = gl!.createShader(type)!;
        gl!.shaderSource(shader, source);
        gl!.compileShader(shader);
        if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS) && !gl!.isContextLost()) {
          throw new Error(gl!.getShaderInfoLog(shader) ?? "shader failed to compile");
        }
        return shader;
      };
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
      gl.bindAttribLocation(program, 0, "a_seed");
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
        throw new Error(gl.getProgramInfoLog(program) ?? "program failed to link");
      }
      gl.useProgram(program);
      locations = {};
      for (const name of [
        "u_time",
        "u_resolution",
        "u_pointer",
        "u_activity",
        "u_cursor",
        "u_presence",
        "u_spin",
        "u_dpr",
        "u_arm",
        "u_color1",
        "u_color2",
        "u_color3",
        "u_color4",
      ]) {
        locations[name] = gl.getUniformLocation(program, name);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, buildSeeds(options.count), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      applyColors();
      resize();
    } catch (error) {
      fail(error);
    }
  };

  const applyColors = (): void => {
    if (!gl || !program) return;
    colors.slice(0, 4).forEach((hex, index) => {
      gl!.uniform3fv(locations[`u_color${index + 1}`] ?? null, hexToRgb(hex));
    });
  };

  const ratio = (): number => Math.min(window.devicePixelRatio || 1, options.maxDpr) * quality;

  const resize = (): void => {
    const r = ratio();
    const width = Math.max(1, Math.round(canvas.clientWidth * r));
    const height = Math.max(1, Math.round(canvas.clientHeight * r));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  };

  const draw = (): void => {
    if (!gl || !program) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(locations.u_time ?? null, motion.matches ? options.stillTime : time);
    gl.uniform2f(locations.u_resolution ?? null, canvas.width, canvas.height);
    gl.uniform2f(locations.u_pointer ?? null, pointer[0]!, pointer[1]!);
    gl.uniform1f(locations.u_activity ?? null, motion.matches ? 0 : activity);
    gl.uniform2f(locations.u_cursor ?? null, cursor[0]!, cursor[1]!);
    gl.uniform1f(locations.u_presence ?? null, motion.matches ? 0 : presence);
    gl.uniform1f(locations.u_spin ?? null, spin);
    gl.uniform1f(locations.u_dpr ?? null, ratio());
    // Wider screens: longer arms (up to 1.3x) so the form spans more of the page.
    gl.uniform1f(
      locations.u_arm ?? null,
      1 + 0.3 * Math.min(1, Math.max(0, (canvas.width / canvas.height - 1.4) / 0.6)),
    );
    gl.drawArrays(gl.POINTS, 0, drawCount);
    if (!ready) {
      ready = true;
      options.onReady?.();
    }
  };

  // Steps quality down after a sustained run of slow frames: fewer grains first,
  // then a lower resolution. It does not step back up within a visit.
  const govern = (frameMs: number): void => {
    if (frameMs <= 0 || frameMs > 250) return;
    average += (frameMs - average) * 0.1;
    slow = average > 22 ? slow + 1 : 0;
    if (slow < 45) return;
    slow = 0;
    average = 16.7;
    if (drawCount > options.count * 0.5) {
      drawCount = Math.round(drawCount * 0.75);
    } else if (quality > 0.6) {
      quality = 0.7;
      resize();
    }
  };

  const tick = (now: number): void => {
    frameId = 0;
    const elapsed = lastTick ? now - lastTick : 0;
    lastTick = now;
    if (!motion.matches) {
      govern(elapsed);
      const delta = Math.min(elapsed, 100);
      time += delta / 1000;
      const ease = 1 - Math.pow(0.93, delta / 16.7);
      pointer[0]! += (pointerTarget[0]! - pointer[0]!) * ease;
      pointer[1]! += (pointerTarget[1]! - pointer[1]!) * ease;
      activityTarget *= Math.pow(0.97, delta / 16.7);
      activity += (activityTarget - activity) * ease;
      // The vortex tracks the pointer fast (30% of the gap per 60 fps frame),
      // forms in about a third of a second and keeps turning while it rests.
      const quick = 1 - Math.pow(0.7, delta / 16.7);
      cursor[0]! += (pointerTarget[0]! - cursor[0]!) * quick;
      cursor[1]! += (pointerTarget[1]! - cursor[1]!) * quick;
      presence += (presenceTarget - presence) * (1 - Math.pow(0.88, delta / 16.7));
      spin = (spin + (delta / 1000) * presence) % 600;
    }
    draw();
    schedule();
  };

  const schedule = (): void => {
    if (frameId || destroyed || !program || !visible || document.hidden) return;
    if (motion.matches && ready) return; // one still frame is enough
    frameId = requestAnimationFrame(tick);
  };

  const wake = (): void => {
    lastTick = 0;
    schedule();
  };

  const onPointer = (event: PointerEvent): void => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const rawX = (event.clientX - rect.left) / rect.width;
    const rawY = (event.clientY - rect.top) / rect.height;
    const inside = rawX >= 0 && rawX <= 1 && rawY >= 0 && rawY <= 1;
    // A mouse only has to hover; on touch the vortex lives while the finger is down.
    presenceTarget =
      inside && (event.pointerType !== "touch" || event.type !== "pointerup") ? 1 : 0;
    const x = Math.min(1, Math.max(0, rawX));
    const y = Math.min(1, Math.max(0, 1 - rawY));
    const moved =
      event.type === "pointerdown"
        ? 0.6
        : Math.hypot(x - pointerTarget[0]!, y - pointerTarget[1]!) * 4;
    activityTarget = Math.min(1, activityTarget + moved);
    pointerTarget[0] = x;
    pointerTarget[1] = y;
  };

  const onMotionChange = (): void => {
    ready = false;
    wake();
  };

  const onContextLost = (event: Event): void => {
    event.preventDefault();
    program = null;
    cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const onContextRestored = (): void => {
    ready = false;
    init();
    wake();
  };

  const visibility = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? false;
      if (visible && !gl) init();
      wake();
    },
    { rootMargin: "64px" },
  );
  const sizing = new ResizeObserver(() => {
    resize();
    if (motion.matches) ready = false;
    wake();
  });

  visibility.observe(canvas);
  sizing.observe(canvas);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerdown", onPointer, { passive: true });
  const onRelease = (event: PointerEvent): void => {
    if (event.pointerType === "touch") presenceTarget = 0;
  };
  const onLeave = (): void => {
    presenceTarget = 0;
  };
  window.addEventListener("pointerup", onRelease, { passive: true });
  window.addEventListener("pointercancel", onRelease, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  motion.addEventListener("change", onMotionChange);

  return {
    setColors(next) {
      colors = next;
      applyColors();
      if (motion.matches) ready = false;
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
      window.removeEventListener("pointerup", onRelease);
      window.removeEventListener("pointercancel", onRelease);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      motion.removeEventListener("change", onMotionChange);
      if (gl && program) gl.deleteProgram(program);
      program = null;
    },
  };
}

/**
 * Renders one still frame of the sculpture, centred, into a transparent
 * canvas: the image the liquid engine samples into particles. Densely drawn
 * (more points than the live version), since it is drawn once. Returns null
 * without WebGL.
 */
export function renderSculptureImage(
  colors: readonly string[],
  width: number,
  height: number,
  options: { count: number; time: number; /** Arm stretch, 1 = as designed. */ arm?: number },
): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: true,
    preserveDrawingBuffer: true,
  });
  if (!gl) return null;
  try {
    const compile = (type: number, source: string): WebGLShader => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("no shader");
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) ?? "shader failed to compile");
      }
      return shader;
    };
    const program = gl.createProgram();
    if (!program) throw new Error("no program");
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.bindAttribLocation(program, 0, "a_seed");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "program failed to link");
    }
    gl.useProgram(program);
    const u = (name: string): WebGLUniformLocation | null => gl.getUniformLocation(program, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, buildSeeds(options.count), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    colors
      .slice(0, 4)
      .forEach((hex, index) => gl.uniform3fv(u(`u_color${index + 1}`), hexToRgb(hex)));
    gl.uniform1f(u("u_time"), options.time);
    gl.uniform2f(u("u_resolution"), width, height);
    gl.uniform2f(u("u_pointer"), 0.5, 0.5);
    gl.uniform2f(u("u_cursor"), -10, -10);
    gl.uniform1f(u("u_activity"), 0);
    gl.uniform1f(u("u_presence"), 0);
    gl.uniform1f(u("u_spin"), 0);
    // A little larger points than live, so the still reads as continuous silk.
    gl.uniform1f(u("u_dpr"), 1.35);
    gl.uniform3f(u("u_place"), 0.5, 0.5, height * 0.25);
    gl.uniform1f(u("u_arm"), options.arm ?? 1);
    gl.viewport(0, 0, width, height);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, options.count);
    // Copy out, then free the context straight away.
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    out.getContext("2d")?.drawImage(canvas, 0, 0);
    return out;
  } catch {
    return null;
  } finally {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
