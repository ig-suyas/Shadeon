import {
  STUDIO_GLSL,
  mat4,
  rayToGround,
  type Mat4,
  type StudioFrame,
  type StudioGL,
  type StudioInstance,
  type StudioMaterial,
  type Vec2,
  type Vec3,
} from "@/studio/core";

/**
 * Lodestone: a shallow dish of ferrofluid with a magnet held under it.
 *
 * The magnet's field pulls the fluid into a mound (the puddle's edge reaches
 * toward it and thins around it) and, above a critical strength, the surface
 * breaks into Rosensweig spikes on a hexagonal lattice. The lattice is a
 * displacement field: the wake drags it, the field twists it, curl noise
 * stirs it and a spring re-centres it, so the crown slides after the magnet,
 * leans back while it moves and settles under it when it stops. Spikes grow
 * and collapse per cell (sampled at each spike's centre), so they never look
 * sliced. Rendered as a perspective mesh with analytic per-pixel normals, two
 * softboxes, a strip light and a rim lamp, fresnel, valley occlusion, ACES
 * tone mapping and grain.
 *
 * Palette: dish, fluid, key light, rim light.
 */

// Simulation state, both in screen-uv parameterisation of the ground plane:
// bulk = (mound height, mound velocity, spike amplitude, spike velocity)
// lattice = (offset.xz, velocity.xz), in world units
const CAMERA = /* glsl */ `
uniform mat4 uVP;
uniform mat4 uInvVP;
vec2 worldAt(vec2 uv){
  vec2 n = uv * 2.0 - 1.0;
  vec4 a = uInvVP * vec4(n, -1.0, 1.0); a /= a.w;
  vec4 b = uInvVP * vec4(n, 1.0, 1.0); b /= b.w;
  float t = a.y / (a.y - b.y);
  return mix(a.xz, b.xz, t);
}
vec2 uvOf(vec2 xz){ vec4 p = uVP * vec4(xz.x, 0.0, xz.y, 1.0); return p.xy / p.w * 0.5 + 0.5; }
`;

const COMMON = /* glsl */ `
uniform float uTime;
uniform float uAspect;
uniform vec2 uPointerA;
uniform float uRadius;
uniform float uPresence;
uniform sampler2D uWake;
uniform vec2 uMag;
uniform float uFieldR;
uniform float uStrength;
uniform float uSwirl;
uniform float uSpacing;
uniform float uBurst;
uniform float uBurstAge;
uniform vec2 uBurstW;
${STUDIO_GLSL}
${CAMERA}
// A tap is a field pulse: a ring that runs outward from the tap point, plus a
// brief surge at the tap itself. Shared by the simulation and the spike heights.
float pulseField(vec2 p){
  float pulse = exp(-uBurstAge * 1.25) * step(0.0005, uBurst + exp(-uBurstAge * 3.0));
  vec2 db = p - uBurstW;
  float rb = length(db);
  float front = uFieldR * (0.3 + uBurstAge * 3.4);
  float ring = exp(-pow((rb - front) / (uFieldR * 0.36), 2.0)) * pulse;
  return ring * 1.2 + pulse * exp(-rb * rb / (uFieldR * uFieldR)) * 0.6;
}
`;

const SIM_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
layout(location = 0) out vec4 oBulk;
layout(location = 1) out vec4 oLat;
uniform sampler2D uBulk;
uniform sampler2D uLat;
uniform vec2 uTexel;
uniform float uDt;
uniform float uVisc;
${COMMON}
void main(){
  vec2 p = worldAt(vUv);
  vec4 wk = texture(uWake, vUv);
  // wake velocity: aspect units -> uv -> world, through the local Jacobian
  vec2 wuv = wk.xy * vec2(1.0 / uAspect, 1.0);
  vec2 wWorld = (worldAt(vUv + wuv * 4.0) - p) * 0.25;

  // the fluid carries its own state along the wake
  vec2 back = vUv - wuv * uDt * 0.8;
  vec4 B = texture(uBulk, back);
  vec4 L = texture(uLat, back);

  vec2 d = p - uMag;
  float r2 = dot(d, d);
  float R2 = uFieldR * uFieldR;
  float g1 = exp(-r2 / R2) * uPresence;
  float g2 = exp(-r2 / (R2 * 5.0)) * uPresence;
  float burstField = pulseField(p);
  float field = uStrength * g1 + burstField;

  float E = max(sEnergy(vec2(vUv.x * uAspect, vUv.y), uPointerA, uRadius, uPresence, wk), clamp(B.z, 0.0, 1.0));

  // mound: second-order spring toward the field, plus a wave term so pulses roll outward
  float h = B.x;
  float hv = B.y;
  float lap = texture(uBulk, back + vec2(uTexel.x, 0.0)).x + texture(uBulk, back - vec2(uTexel.x, 0.0)).x
            + texture(uBulk, back + vec2(0.0, uTexel.y)).x + texture(uBulk, back - vec2(0.0, uTexel.y)).x - 4.0 * h;
  float hT = uStrength * (0.085 * g1 - 0.022 * g2);
  hv += ((hT - h) * 0.075 / uVisc + lap * 0.16) * uDt;
  hv += burstField * 0.0018 * uDt;
  hv *= pow(mix(0.84, 0.91, E), uDt);
  h += hv * uDt;

  // spikes: appear only above the critical field; grow fast, collapse slower
  float St = smoothstep(0.24, 0.9, field);
  float S = B.z;
  float Sv = B.w;
  bool rising = St > S;
  Sv += (St - S) * (rising ? 0.22 : 0.075 / uVisc) * uDt;
  Sv *= pow(rising ? 0.72 : 0.8, uDt);
  S = clamp(S + Sv * uDt, -0.05, 1.25);

  // lattice: crowded toward the pole, twisted, dragged by the wake, stirred, re-centred
  vec2 off = L.xy;
  vec2 lv = L.zw;
  // d / R rather than a unit vector: the forces fade to zero at the pole
  vec2 n = d / uFieldR;
  float f = g1 * uStrength;
  vec2 acc = -n * f * 0.0006;
  acc += vec2(-n.y, n.x) * f * 0.0011 * uSwirl;
  acc += (wWorld * 0.9 - lv) * E * 0.14;
  acc += sCurl(p * 2.4 + vec2(uTime * 0.3, -uTime * 0.21)) * E * 0.0002;
  acc -= off * 0.011 / uVisc;
  lv += acc * uDt;
  // damping depends on local energy: viscous at rest, looser while stirred
  lv *= pow(mix(0.85, 0.935, E), uDt);
  off = clamp(off + lv * uDt, vec2(-0.3), vec2(0.3));

  oBulk = vec4(h, hv, S, Sv);
  oLat = vec4(off, lv);
}
`;

// Surface shared by the mesh (vertex heights) and the shading (normals).
const SURFACE = /* glsl */ `
uniform sampler2D uBulk;
uniform sampler2D uLat;
uniform float uHeight;
uniform float uSeed;
uniform vec2 uPuddle;
${COMMON}
float puddle(vec2 xz){
  vec2 q = xz / uPuddle;
  float n = sNoise(xz * 1.1 + uSeed * 1.7) * 0.05 + sNoise(xz * 2.7 - uSeed * 0.9) * 0.012;
  return (1.0 - length(q)) * min(uPuddle.x, uPuddle.y) * 0.55 + n;
}
// Nearest centre on a hexagonal lattice with unit spacing: (local offset, cell id).
vec4 hexCell(vec2 p){
  const vec2 s = vec2(1.0, 1.7320508);
  vec4 hc = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  vec4 h = vec4(p - hc.xy * s, p - (hc.zw + 0.5) * s);
  return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hc.xy) : vec4(h.zw, hc.zw + 0.5);
}
// Concave flanks, a small rounded tip, reaching zero in the valleys.
float spikeProfile(float r){
  float d = r * 2.0;
  float u = clamp((sqrt(d * d + 0.0016) - 0.04) / 1.02, 0.0, 1.0);
  return pow(1.0 - u, 2.0);
}
struct Surf { float h; float T; float amp; float prof; float E; float speed; };
Surf surface(vec2 xz){
  Surf s;
  vec2 uv = uvOf(xz);
  vec4 B = texture(uBulk, uv);
  vec4 L = texture(uLat, uv);
  vec4 wk = texture(uWake, uv);
  s.T = puddle(xz) + B.x * 2.4;
  float inside = smoothstep(0.0, 0.05, s.T);
  float base = 0.03 * (1.0 - exp(-max(s.T, 0.0) * 20.0));

  vec2 dm = xz - uMag;
  float g = exp(-dot(dm, dm) / (uFieldR * uFieldR)) * uPresence;
  // spikes pack tighter where the field is strong
  float freq = (1.0 + 0.22 * g * uStrength) / uSpacing;
  vec2 n = dm / uFieldR;
  vec2 lean = L.zw * 5.0 + vec2(-n.y, n.x) * g * uSwirl * 0.1 * uSpacing;
  // a soft limit: past a third of the spacing the sheared lookup would jump cells
  float ll = length(lean);
  float lim = 0.32 * uSpacing;
  lean *= lim * (1.0 - exp(-ll / lim)) / max(ll, 1e-6);

  // evaluate once upright, then shear the profile along the lean
  vec2 q = (xz - L.xy) * freq;
  vec4 c = hexCell(q);
  float prof0 = spikeProfile(length(c.xy));
  vec2 qs = q - lean * freq * prof0;
  c = hexCell(qs);
  float prof = spikeProfile(length(c.xy));
  vec2 centre = (qs - c.xy) / freq + L.xy;
  // each spike grows as a whole, from the amplitude at its own centre
  float Sc = texture(uBulk, uvOf(centre)).z;
  vec2 dc = centre - uMag;
  float gc = exp(-dot(dc, dc) / (uFieldR * uFieldR)) * uPresence * uStrength + pulseField(centre);
  float id = sHash12(c.zw + uSeed * 0.37);
  float hum = 1.0 + 0.05 * sin(uTime * 7.0 + id * 6.283) * smoothstep(0.2, 1.0, Sc);
  s.amp = max(Sc, 0.0) * (0.8 + 0.32 * id) * hum * (0.5 + 0.75 * min(gc, 1.2));
  s.prof = prof;
  float spike = uHeight * uSpacing * 1.9 * s.amp * prof * smoothstep(0.02, 0.14, s.T);

  s.E = max(sEnergy(vec2(uv.x * uAspect, uv.y), uPointerA, uRadius, uPresence, wk), clamp(B.z, 0.0, 1.0));
  s.speed = length(L.zw) / uSpacing;
  float ripple = sNoise(xz * 34.0 + vec2(uTime * 1.3, -uTime)) * 0.0011 * s.E;
  s.h = max(0.0, (base + B.x + ripple) * inside) + spike;
  return s;
}
`;

// The surface is evaluated once per texel into a height map that covers the
// mesh's (overhanging) domain: (height, puddle thickness, valley depth, energy).
const HEIGHT_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform vec4 uDomain;
${SURFACE}
void main(){
  Surf s = surface(worldAt(uDomain.xy + vUv * uDomain.zw));
  o = vec4(s.h, s.T, s.amp * (1.0 - s.prof), s.E);
}
`;

const MESH_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vXz;
out vec2 vGround;
out vec4 vJ;
uniform sampler2D uHeightTex;
uniform vec4 uDomain;
${CAMERA}
void main(){
  vec2 xz = worldAt(aPos);
  float h = texture(uHeightTex, (aPos - uDomain.xy) / uDomain.zw).r;
  vXz = xz;
  vGround = aPos;
  // Jacobian of the ground mapping (world per ground uv), for exact normals
  // without screen-space derivatives (which break at spike silhouettes)
  vJ = vec4(worldAt(aPos + vec2(0.002, 0.0)) - xz, worldAt(aPos + vec2(0.0, 0.002)) - xz) / 0.002;
  gl_Position = uVP * vec4(xz.x, h, xz.y, 1.0);
}
`;

const MESH_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vXz;
in vec2 vGround;
in vec4 vJ;
out vec4 o;
uniform sampler2D uHeightTex;
uniform vec4 uDomain;
uniform vec2 uHeightTexel;
uniform vec3 uCam;
uniform vec3 uDish;
uniform vec3 uFluid;
uniform vec3 uKey;
uniform vec3 uRim;
uniform float uLight;
uniform vec2 uRes;
uniform sampler2D uLat;
uniform float uSeed;
${COMMON}

// Directions in world space (y up, the camera looks toward -z). A flat pool
// reflects elevations of roughly 40 to 70 degrees, so the key sits inside
// that band but covers only part of it: the pool stays black around it.
const vec3 KEY_DIR = vec3(-0.2, 0.9, -0.39);
const vec3 STRIP_DIR = vec3(0.9, 0.3, -0.3);
const vec3 RIM_DIR = vec3(-0.42, 0.16, -0.89);
// Behind and above the camera: only spike flanks facing the viewer see it.
const vec3 FRONT_DIR = vec3(0.12, 0.72, 0.68);
// Low on the left: catches the left flanks.
const vec3 KICK_DIR = vec3(-0.93, 0.3, 0.18);

// A rectangular diffuser seen in direction space; softer when the surface is rough.
float gAa = 0.0;
float softbox(vec3 R, vec3 axis, vec2 size, float rough){
  // crisp diffuser edges on the mirror-like fluid, softer on rough surfaces
  vec3 t = normalize(cross(vec3(0.0, 1.0, 0.0), axis));
  vec3 b = cross(axis, t);
  float c = dot(R, axis);
  if (c <= 0.05) return 0.0;
  vec2 q = vec2(dot(R, t), dot(R, b)) / c;
  vec2 e = abs(q) - size;
  float soft = 0.004 + rough * 0.3 + gAa;
  float m = (1.0 - smoothstep(-soft, soft, e.x)) * (1.0 - smoothstep(-soft, soft, e.y));
  vec2 k = q / size;
  return m * (1.0 - 0.18 * dot(k, k));
}
vec3 env(vec3 R, float rough){
  // A dark studio: the ceiling is flagged black and the walls near the horizon
  // carry a dim band, so the crown shows in silhouette against it.
  vec3 wall = mix(uDish, uKey, mix(0.32, 0.22, uLight)) * mix(1.05, 0.8, uLight);
  vec3 c = wall * (1.0 - smoothstep(0.0, 0.42, R.y)) + vec3(0.0012);
  c += uKey * smoothstep(0.6, 1.0, R.y) * 0.04;
  c += uKey * softbox(R, normalize(KEY_DIR), vec2(0.085, 0.036), rough) * 9.0;
  c += uKey * softbox(R, normalize(STRIP_DIR), vec2(0.035, 0.5), rough) * 6.0;
  c += uKey * softbox(R, normalize(FRONT_DIR), vec2(0.55, 0.28), rough + 0.12) * 6.5;
  c += mix(uKey, uRim, 0.35) * softbox(R, normalize(KICK_DIR), vec2(0.05, 0.3), rough) * 4.0;
  float rc = max(dot(R, normalize(RIM_DIR)), 0.0);
  c += uRim * (pow(rc, mix(260.0, 30.0, rough)) * 7.0 + pow(rc, 6.0) * 0.15);
  return c;
}

void main(){
  vec2 xz = vXz;
  // central differences in the height map, mapped to world space through the
  // ground Jacobian: grad_xz = inverse(J)^T * grad_ground
  vec2 huv = (vGround - uDomain.xy) / uDomain.zw;
  vec2 tx = vec2(uHeightTexel.x, 0.0);
  vec2 ty = vec2(0.0, uHeightTexel.y);
  vec4 c = texture(uHeightTex, huv);
  vec2 gHuv = vec2(texture(uHeightTex, huv + tx).r - texture(uHeightTex, huv - tx).r,
                   texture(uHeightTex, huv + ty).r - texture(uHeightTex, huv - ty).r) / (2.0 * uHeightTexel);
  vec2 gGround = gHuv / uDomain.zw;
  mat2 J = mat2(vJ.xy, vJ.zw);
  vec2 grad = transpose(inverse(J)) * gGround;
  vec3 N = normalize(vec3(-grad.x, 1.0, -grad.y));
  float h = c.r;
  float T = c.g;
  float valley = c.b;
  float E = c.a;
  float speed = length(texture(uLat, vGround).zw) / uSpacing;
  vec3 P = vec3(xz.x, h, xz.y);
  vec3 V = normalize(uCam - P);
  float NdV = clamp(dot(N, V), 0.0, 1.0);
  vec3 R = reflect(-V, N);
  gAa = min(length(fwidth(R)) * 0.6, 0.08);
  float fres = pow(1.0 - NdV, 5.0);

  float w = max(fwidth(T), 1e-5);
  float isFluid = smoothstep(-0.7 * w, 0.7 * w, T);
  vec3 fluid = vec3(0.0);
  vec3 dish = vec3(0.0);

  // fluid: black, glossy, every light reflected in it (each branch runs only where needed)
  if (isFluid > 0.001) {
    float glint = smoothstep(0.012, 0.16, speed) * E;
    float occl = mix(1.0, 0.32, clamp(valley * 1.5, 0.0, 1.0));
    fluid = env(R, 0.03) * (0.06 + 0.94 * fres) * occl;
    // fast material catches the rim light in sharp flashes
    float rc = max(dot(R, normalize(RIM_DIR)), 0.0);
    float kc = max(dot(R, normalize(KEY_DIR)), 0.0);
    fluid += (uRim * pow(rc, 40.0) * 3.0 + uKey * pow(kc, 220.0) * 6.0) * glint;
    fluid += uFluid * (0.2 + 0.4 * max(N.y, 0.0));
  }

  // dish: ceramic in light themes, graphite in dark ones; a pool of key light, contact shadow
  if (isFluid < 0.999) {
    float pool = exp(-dot(xz, xz) * 0.55);
    float diff = (max(dot(N, normalize(KEY_DIR)), 0.0) * 0.85 + 0.32) * (0.62 + mix(1.1, 0.5, uLight) * pool) * mix(1.7, 1.0, uLight);
    float contact = 1.0 - 0.55 * smoothstep(-0.14, 0.0, T);
    float grainy = 1.0 + sNoise(xz * 90.0) * 0.025 + sNoise(xz * 9.0 + uSeed) * 0.03;
    float dishRough = mix(0.5, 0.2, uLight);
    dish = uDish * diff * contact * grainy;
    dish += env(R, dishRough) * (0.04 + 0.96 * fres) * mix(0.18, 0.4, uLight) * contact;
  }
  vec3 col = mix(dish, fluid, isFluid);

  // depth: the far side of the dish falls into the room
  float dist = length(uCam - P);
  col = mix(col, uDish * mix(0.45, 0.9, uLight), smoothstep(3.4, 5.6, dist) * 0.8);
  vec2 sv = gl_FragCoord.xy / uRes - 0.5;
  col *= 1.0 - dot(sv, sv) * mix(0.55, 0.25, uLight);

  col = sTonemap(col);
  col = sGrain(col, gl_FragCoord.xy, uTime, mix(0.014, 0.008, uLight));
  o = vec4(col, 1.0);
}
`;

const FOV = (30 * Math.PI) / 180;
const ELEVATION = (56 * Math.PI) / 180;
/** World units between neighbouring spikes at scale 1. */
const SPACING = 0.07;
/** The mesh and its height map overhang the screen (uv), so displaced spikes cover the edges. */
const DOMAIN: [number, number, number, number] = [-0.03, -0.14, 1.06, 1.16];

function num(frame: StudioFrame, key: string, fallback: number): number {
  const v = frame.params[key];
  return typeof v === "number" ? v : fallback;
}

export const material: StudioMaterial = {
  settleFrames: 300,
  glsl: {
    "simulation.frag": SIM_FS,
    "height.frag": HEIGHT_FS,
    "mesh.vert": MESH_VS,
    "mesh.frag": MESH_FS,
  },
  antialias: true,
  depth: true,
  stillAt: 0.78,
  ghost: {
    seconds: 3.2,
    path(t) {
      const e = 1 - Math.pow(1 - Math.min(1, t * 1.25), 3);
      return [0.27 + 0.33 * e, 0.42 + 0.08 * Math.sin(t * Math.PI)];
    },
  },
  create(studio: StudioGL): StudioInstance {
    const gl = studio.gl;
    const sim = studio.program(SIM_FS);
    const heightPass = studio.program(HEIGHT_FS);
    const mesh = studio.program(MESH_FS, MESH_VS);
    let state = studio.pingPong(2, 2, { precision: "full", attachments: 2 });
    let heights = studio.target(2, 2, { precision: "half" });
    const vbo = studio.buffer();
    const ibo = studio.buffer();
    const vao = studio.vertexArray();
    let indexCount = 0;
    let gridKey = "";

    let vp: Mat4 = new Float32Array(16);
    let inv: Mat4 = new Float32Array(16);
    let cam: Vec3 = [0, 0, 0];
    let puddle: Vec2 = [1, 0.8];
    let aspect = 1;

    const clearState = (): void => state.clear(0, 0, 0, 0);

    const layout = (f: StudioFrame): void => {
      aspect = f.aspect;
      const d = Math.sin(ELEVATION) / Math.tan(FOV / 2);
      cam = [0, d * Math.sin(ELEVATION), d * Math.cos(ELEVATION)];
      const view = mat4.lookAt(cam, [0, 0, 0], [0, 1, 0]);
      const proj = mat4.perspective(FOV, aspect, 0.1, 20);
      vp = mat4.multiply(proj, view);
      inv = mat4.invert(vp);
      const halfW = d * Math.tan(FOV / 2) * aspect;
      puddle = [halfW * 0.8, 0.76];

      // Simulation grid follows the canvas shape.
      const base = studio.lowPower ? 160 : 256;
      const sw = aspect >= 1 ? base : Math.round(base * aspect);
      const sh = aspect >= 1 ? Math.round(base / aspect) : base;
      if (state.read.width !== sw || state.read.height !== sh) {
        state = studio.pingPong(sw, sh, { precision: "full", attachments: 2 });
        clearState();
      }

      // Height map at 0.75 of the drawing buffer (0.55 on low power): normals are
      // read with bilinear filtering, so spikes stay smooth.
      const hq = studio.lowPower ? 0.55 : 0.75;
      const hw = Math.min(2600, Math.round(f.width * DOMAIN[2] * hq));
      const hh = Math.min(1700, Math.round(f.height * DOMAIN[3] * hq));
      if (heights.width !== hw || heights.height !== hh) {
        heights = studio.target(hw, hh, { precision: "half" });
      }

      // Screen-space grid: a vertex every 5 drawing-buffer px (7 on low power).
      // Shading is per pixel from the height map; the grid only carries silhouettes.
      const step = studio.lowPower ? 7 : 5;
      const cols = Math.min(720, Math.max(64, Math.round(f.width / step)));
      const rows = Math.min(480, Math.max(48, Math.round(f.height / step)));
      const key = `${cols}x${rows}`;
      if (key === gridKey) return;
      gridKey = key;
      // The grid overhangs the screen so displaced spikes near the edges still cover it.
      const [u0, v0] = DOMAIN;
      const u1 = DOMAIN[0] + DOMAIN[2];
      const v1 = DOMAIN[1] + DOMAIN[3];
      const verts = new Float32Array((cols + 1) * (rows + 1) * 2);
      let k = 0;
      for (let j = 0; j <= rows; j++) {
        for (let i = 0; i <= cols; i++) {
          verts[k++] = u0 + ((u1 - u0) * i) / cols;
          verts[k++] = v0 + ((v1 - v0) * j) / rows;
        }
      }
      const idx = new Uint32Array(cols * rows * 6);
      k = 0;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const a = j * (cols + 1) + i;
          const b = a + 1;
          const c = a + cols + 1;
          const dd = c + 1;
          idx[k++] = a;
          idx[k++] = b;
          idx[k++] = c;
          idx[k++] = b;
          idx[k++] = dd;
          idx[k++] = c;
        }
      }
      indexCount = idx.length;
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
    };

    /** Magnet position and field radius on the ground plane. */
    const magnet = (f: StudioFrame): { at: Vec2; r: number; burst: Vec2 } => {
      const at = rayToGround(inv, f.pointer);
      const side = rayToGround(inv, [f.pointer[0] + f.radius / f.aspect, f.pointer[1]]);
      return {
        at,
        r: Math.max(0.05, Math.hypot(side[0] - at[0], side[1] - at[1])),
        burst: rayToGround(inv, f.burstAt),
      };
    };

    const shared = (p: typeof sim, f: StudioFrame, m: ReturnType<typeof magnet>): void => {
      const coarse = f.coarse ? 1.15 : 1;
      p.frame(f)
        .set("uVP", vp)
        .set("uInvVP", inv)
        .set("uMag", m.at)
        .set("uFieldR", m.r)
        .set("uStrength", num(f, "intensity", 1) * coarse)
        .set("uSwirl", num(f, "swirl", 0.8))
        .set("uSpacing", SPACING / num(f, "scale", 1))
        .set("uBurstW", m.burst);
    };

    return {
      resize: layout,
      step(f) {
        if (f.aspect !== aspect || !gridKey) layout(f);
        const m = magnet(f);
        // Substeps keep the wave term stable on slow frames and at high speed.
        const total = f.dt * num(f, "speed", 1);
        const n = Math.max(1, Math.ceil(total / 1.2));
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        for (let i = 0; i < n; i++) {
          state.write.bind();
          sim.use();
          shared(sim, f, m);
          sim
            .tex("uBulk", state.read.textures[0] ?? null, 0)
            .tex("uLat", state.read.textures[1] ?? null, 1)
            .set("uTexel", [1 / state.read.width, 1 / state.read.height])
            .set("uDt", total / n)
            .set("uVisc", num(f, "viscosity", 1));
          studio.fullscreen();
          state.swap();
        }
      },
      draw(f) {
        if (f.aspect !== aspect || !gridKey) layout(f);
        const m = magnet(f);
        const [dish, fluid, key, rim] = [0, 1, 2, 3].map(
          (i) => f.colors[i] ?? ([0.5, 0.5, 0.5] as Vec3),
        ) as [Vec3, Vec3, Vec3, Vec3];
        // 1. The surface, once per texel.
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        heights.bind();
        heightPass.use();
        shared(heightPass, f, m);
        heightPass
          .tex("uBulk", state.read.textures[0] ?? null, 0)
          .tex("uLat", state.read.textures[1] ?? null, 1)
          .set("uHeight", num(f, "height", 1))
          .set("uSeed", num(f, "seed", 7) * 0.618)
          .set("uPuddle", puddle)
          .set("uDomain", DOMAIN);
        studio.fullscreen();

        // 2. The displaced mesh, shaded from the height map.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, f.width, f.height);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.disable(gl.BLEND);
        gl.clearColor(dish[0], dish[1], dish[2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        mesh.use();
        shared(mesh, f, m);
        mesh
          .tex("uHeightTex", heights.textures[0] ?? null, 0)
          .set("uHeightTexel", [1 / heights.width, 1 / heights.height])
          .tex("uLat", state.read.textures[1] ?? null, 1)
          .set("uDomain", DOMAIN)
          .set("uSeed", num(f, "seed", 7) * 0.618)
          .set("uCam", cam)
          .set("uDish", dish)
          .set("uFluid", fluid)
          .set("uKey", key)
          .set("uRim", rim);
        gl.bindVertexArray(vao);
        gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0);
        gl.bindVertexArray(null);
        gl.disable(gl.DEPTH_TEST);
      },
      rest: clearState,
    };
  },
};
