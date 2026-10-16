import {
  STUDIO_GLSL,
  gridSize,
  param,
  type StudioFrame,
  type StudioGL,
  type StudioInstance,
  type StudioMaterial,
  type Vec3,
} from "@/studio/core";

/**
 * Flint Glass: a slab of warm, slightly soft optical glass lying on an
 * engraved print. The pointer presses a lens into it.
 *
 * The glass surface is a viscous height field: the pointer pushes a dimple
 * with a raised lip (the glass it displaces), swirls it, and the wake drags a
 * trough behind it that sags back slowly, so the glass remembers the path.
 * Heat shimmer (curl-noise normals) rises where it is stirred. The print is
 * seen through it with six-wavelength dispersion (a Cauchy-style index per
 * wavelength), so colour appears only where the surface is bent and trails
 * behind the motion. Curvature focuses light into caustics on the print; a
 * window reflects in the surface with Schlick fresnel; bevelled edges and
 * thick glass carry a soda-green tint. ACES tone mapping and grain.
 *
 * Palette: paper, ink, accent ink, glass tint.
 */

// State, in screen uv: (height, height velocity, heat, unused). Heights are in
// canvas heights; the dimple is a few percent deep.
const SIM_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uState;
uniform sampler2D uWake;
uniform vec2 uTexel;
uniform float uAspect;
uniform vec2 uPointerA;
uniform float uRadius;
uniform float uPresence;
uniform float uBurst;
uniform float uBurstAge;
uniform vec2 uBurstAt;
uniform float uTime;
uniform float uDt;
uniform float uPress;
uniform float uLens;
uniform float uSwirl;
uniform float uVisc;
${STUDIO_GLSL}
void main(){
  vec2 a = vec2(vUv.x * uAspect, vUv.y);
  vec4 wk = texture(uWake, vUv);
  vec2 d = a - uPointerA;
  float R = uRadius * uLens;
  float g1 = exp(-dot(d, d) / (R * R)) * uPresence;
  // the wake carries the glass; near the pointer it also turns around it
  vec2 flow = wk.xy * 0.85 + vec2(-d.y, d.x) / R * g1 * uSwirl * 0.0035;
  vec2 back = vUv - flow * vec2(1.0 / uAspect, 1.0) * uDt;
  vec4 s = texture(uState, back);
  float h = s.r;
  float hv = s.g;
  float lap = texture(uState, back + vec2(uTexel.x, 0.0)).r + texture(uState, back - vec2(uTexel.x, 0.0)).r
            + texture(uState, back + vec2(0.0, uTexel.y)).r + texture(uState, back - vec2(0.0, uTexel.y)).r - 4.0 * h;
  float E = max(sEnergy(a, uPointerA, uRadius, uPresence, wk), clamp(abs(h) * 30.0, 0.0, 1.0));

  // the press: a dimple with a lip of displaced glass around it
  float r = length(d);
  float lip = exp(-pow((r - R * 1.25) / (R * 0.45), 2.0)) * uPresence;
  float target = uPress * (-0.055 * g1 + 0.014 * lip);
  // strong pull near the pointer, a slow viscous return elsewhere (the glass remembers)
  float pull = (0.0028 + 0.11 * (g1 + lip * 0.5)) / uVisc;
  hv += (target - h) * pull * uDt + lap * 0.11 * uDt;

  // a tap: a lens that rings once
  vec2 q = a - vec2(uBurstAt.x * uAspect, uBurstAt.y);
  float rb = length(q);
  float front = R * (0.2 + uBurstAge * 1.6);
  float ring = exp(-pow((rb - front) / (R * 0.3), 2.0)) * uBurst;
  hv += (ring * 0.0026 - exp(-rb * rb / (R * R)) * uBurst * 0.0018) * uDt;

  // damping depends on local energy: heavy at rest (it sags), lighter while stirred
  hv *= pow(mix(0.8, 0.88, E), uDt);
  h = clamp(h + hv * uDt, -0.12, 0.12);

  // heat: rises with fast motion, fades over a few seconds
  float heat = max(s.b * pow(0.985, uDt), wk.z * 0.9);
  if (abs(h) < 1e-5 && abs(hv) < 1e-6) { h = 0.0; hv = 0.0; }
  o = vec4(h, hv, heat < 0.002 ? 0.0 : heat, 0.0);
}
`;

// The engraved print under the glass, drawn once into a texture.
const PRINT_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform float uAspect;
uniform vec2 uRes;
uniform float uSeed;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uAccent;
uniform float uLight;
${STUDIO_GLSL}
// Coverage of a line where f crosses an integer, width in pixels, antialiased.
float lines(float f, float widthPx){
  float w = max(fwidth(f), 1e-4);
  float d = abs(f - floor(f + 0.5));
  return clamp(widthPx * 0.5 - d / w + 0.5, 0.0, 1.0);
}
// A guilloche ribbon: seven sine strands braided into a rope, each 1.2 px, antialiased.
float ribbon(vec2 p, float y0, float amp, float k, float s){
  float acc = 0.0;
  for (int i = 0; i < 7; i++) {
    float ph = float(i) * 0.8976 + s;
    float y = p.y - y0 - amp * sin(p.x * k + ph) * (0.75 + 0.25 * sin(p.x * k * 0.31 + s));
    float w = max(fwidth(y), 1e-5);
    acc = max(acc, clamp(0.6 - abs(y) / w + 0.5, 0.0, 1.0));
  }
  return acc;
}
void main(){
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  float px = uRes.y;
  float s = uSeed;
  // paper (or slate) with a little fibre
  vec3 col = uPaper * (1.0 + sNoise(p * vec2(420.0, 90.0) + s) * 0.018 + sNoise(p * 6.0 + s) * 0.025);

  // a halftone screen (30 degrees) printing a soft disc: bold dots whose edges
  // show every bend and colour split in the glass
  vec2 sun = vec2(uAspect * (0.6 + 0.05 * sin(s)), 0.52 + 0.04 * cos(s * 1.7));
  float tone = 1.0 - smoothstep(0.05, 0.44, length(p - sun));
  tone = clamp(tone * (0.92 + 0.12 * sNoise(p * 3.0 + s)), 0.0, 1.0);
  mat2 rot = mat2(0.866, 0.5, -0.5, 0.866);
  float cellPx = max(9.0, px / 70.0);
  vec2 hp = rot * p * px / cellPx;
  vec2 cell = fract(hp) - 0.5;
  float dist = length(cell) - 0.5 * sqrt(tone) * 1.02;
  float dots = clamp(0.5 - dist / max(fwidth(dist), 1e-4), 0.0, 1.0) * step(0.015, tone);

  // fine engraved hatching outside the disc
  float wave = 0.003 * sin(p.x * 9.0 + s) + 0.002 * sin(p.x * 23.0 - s * 1.7);
  float hatch = lines((p.y + wave) * px / 5.0, 0.8) * smoothstep(0.38, 0.5, length(p - sun));

  // two guilloche ribbons and a few bold rules
  float rib = max(ribbon(p, 0.15, 0.028, 11.0, s), ribbon(p, 0.86, 0.022, 14.0, s + 1.0));
  vec2 e = min(p, vec2(uAspect, 1.0) - p);
  float m = min(e.x, e.y);
  float frame = clamp(1.0 - abs(m - 0.032) * px / 1.0, 0.0, 1.0) + clamp(2.2 - abs(m - 0.045) * px, 0.0, 1.0);
  float bars = clamp(2.0 - abs(p.y - 0.255) * px, 0.0, 1.0) + clamp(2.0 - abs(p.y - 0.775) * px, 0.0, 1.0);
  bars *= step(0.06, p.x) * step(p.x, uAspect - 0.06);

  float ink = clamp(dots + hatch * 0.4 + frame * 0.85 + bars * 0.9, 0.0, 1.0);
  col = mix(col, uInk, ink * mix(0.88, 0.94, uLight));
  col = mix(col, uAccent, rib * 0.9);
  o = vec4(col, 1.0);
}
`;

const RENDER_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uState;
uniform sampler2D uPrint;
uniform sampler2D uWake;
uniform vec2 uTexel;
uniform float uAspect;
uniform vec2 uRes;
uniform vec2 uPointerA;
uniform float uRadius;
uniform float uPresence;
uniform float uTime;
uniform float uLight;
uniform float uDisp;
uniform vec3 uTint;
uniform vec2 uSlabHalf;
${STUDIO_GLSL}

const float THICK = 0.05;   // slab thickness, in canvas heights
const float BEVEL = 0.05;
const float DEPTH = 0.55;   // optical depth of the soft surface
const float BEVEL_DEPTH = 0.05; // the bevel is steep: a much shorter throw

float sdRound(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
// Distance inside the slab (positive inside).
float inside(vec2 a){ return -sdRound(a - vec2(uAspect * 0.5, 0.5), uSlabHalf, 0.035); }
// A polished, rounded bevel down to the print.
float bevel(float d){ float t = clamp(d / BEVEL, 0.0, 1.0); return THICK * (1.0 - (1.0 - t) * (1.0 - t)); }

// Studio light seen in the glass: a broad soft panel and a small hard lamp.
const vec3 PANEL = vec3(-0.36, 0.42, 0.83);
const vec3 LAMP = vec3(0.45, 0.5, 0.74);

// Spectral weights of six wavelengths, 400 to 700 nm, each column summing to 1.
vec3 spectral(float l){
  vec3 w = vec3(
    exp(-pow((l - 610.0) / 48.0, 2.0)) + 0.18 * exp(-pow((l - 440.0) / 22.0, 2.0)),
    exp(-pow((l - 545.0) / 46.0, 2.0)),
    exp(-pow((l - 455.0) / 36.0, 2.0)));
  return w;
}

void main(){
  vec2 a = vec2(vUv.x * uAspect, vUv.y);
  float px = 1.0 / uRes.y;
  float din = inside(a);
  float slab = smoothstep(-px, px, din);

  // surface: the slab, its bevel and the soft height field inside it
  vec4 s = texture(uState, vUv);
  float sx = texture(uState, vUv + vec2(uTexel.x, 0.0)).r - texture(uState, vUv - vec2(uTexel.x, 0.0)).r;
  float sy = texture(uState, vUv + vec2(0.0, uTexel.y)).r - texture(uState, vUv - vec2(0.0, uTexel.y)).r;
  vec2 grad = vec2(sx / (2.0 * uTexel.x * uAspect), sy / (2.0 * uTexel.y));
  float lap = (texture(uState, vUv + vec2(uTexel.x, 0.0)).r + texture(uState, vUv - vec2(uTexel.x, 0.0)).r
             + texture(uState, vUv + vec2(0.0, uTexel.y)).r + texture(uState, vUv - vec2(0.0, uTexel.y)).r - 4.0 * s.r)
             / (uTexel.y * uTexel.y);
  float soft = smoothstep(0.0, BEVEL * 1.5, din);
  grad *= soft;
  float e = 1.5 * px;
  vec2 bgrad = vec2(bevel(inside(a + vec2(e, 0.0))) - bevel(inside(a - vec2(e, 0.0))),
                    bevel(inside(a + vec2(0.0, e))) - bevel(inside(a - vec2(0.0, e)))) / (2.0 * e);
  vec4 wk = texture(uWake, vUv);
  // one energy for every layer: shimmer, fringes, glints
  float E = max(sEnergy(a, uPointerA, uRadius, uPresence, wk), clamp(abs(s.r) * 28.0 + s.b, 0.0, 1.0));
  vec2 shimmer = sCurl(a * 34.0 + vec2(uTime * 1.7, -uTime * 1.1)) * 0.012 * (s.b + 0.25 * E) * soft;
  vec2 g = grad + shimmer;
  vec2 gAll = g + bgrad;
  float height = bevel(din) + s.r * soft;

  // the print through the glass: six wavelengths, each bent by its own index
  float spread = 0.075 * uDisp * (1.0 + 1.2 * s.b);
  vec3 sum = vec3(0.0);
  vec3 norm = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float l = 400.0 + 60.0 * float(i);
    float n = 1.52 + spread * (pow(550.0 / l, 2.0) - 1.0);
    vec2 off = -(g * DEPTH + bgrad * BEVEL_DEPTH) * (n - 1.0) / n * slab;
    vec3 w = spectral(l);
    vec3 c = texture(uPrint, vUv + off * vec2(1.0 / uAspect, 1.0)).rgb;
    sum += c * w;
    norm += w;
  }
  vec3 col = sum / norm;

  // curvature focuses light: a bump brightens the print under it, a dimple spreads it
  float caustic = clamp(1.0 - lap * soft * DEPTH * 0.0011, 0.55, 2.4);
  col *= mix(1.0, caustic, slab);

  // the glass itself: a soda-green cast, deeper at the bevel and in thick glass
  float thick = clamp((height / THICK) * 0.4 + (1.0 - soft) * 0.9, 0.0, 1.0);
  col *= mix(vec3(1.0), uTint * mix(1.0, 0.7, thick), slab * (0.08 + 0.6 * thick));

  // studio light reflected in the surface, with Schlick fresnel
  vec3 P = vec3(a, height);
  vec3 cam = vec3(uAspect * 0.5, 0.42, 1.9);
  vec3 V = normalize(cam - P);
  vec3 N = normalize(vec3(-gAll, 1.0));
  vec3 R = reflect(-V, N);
  float NdV = clamp(dot(N, V), 0.0, 1.0);
  float fres = 0.04 + 0.96 * pow(1.0 - NdV, 5.0);
  // an even, low sheen over the whole slab that brightens gently toward one corner
  float panel = 0.3 + 0.3 * pow(smoothstep(0.4, 1.0, dot(R, normalize(PANEL))), 2.0);
  // fast, hot glass flashes: the lamp sharpens and brightens with the energy
  float glint = 1.0 + 2.0 * E * smoothstep(0.05, 0.5, s.b);
  float lamp = pow(max(dot(R, normalize(LAMP)), 0.0), mix(1400.0, 700.0, E)) * glint;
  vec3 light = vec3(1.0, 0.98, 0.95);
  col += light * (panel * mix(0.9, 0.6, uLight) * fres + lamp * mix(1.3, 0.9, uLight)) * slab;

  // the slab casts a soft shadow on the print around it
  float shadow = smoothstep(-0.035, 0.0, inside(a + vec2(-0.01, 0.014)));
  col *= 1.0 - (1.0 - slab) * shadow * mix(0.35, 0.18, uLight);

  vec2 sv = vUv - 0.5;
  col *= 1.0 - dot(sv, sv) * mix(0.45, 0.2, uLight);
  col = sTonemap(col * mix(1.15, 1.28, uLight));
  col = sGrain(col, gl_FragCoord.xy, uTime, mix(0.012, 0.008, uLight));
  o = vec4(col, 1.0);
}
`;

export const material: StudioMaterial = {
  settleFrames: 360,
  stillAt: 0.82,
  glsl: {
    "simulation.frag": SIM_FS,
    "print.frag": PRINT_FS,
    "render.frag": RENDER_FS,
  },
  ghost: {
    seconds: 3.4,
    path(t) {
      const e = t * t * (3 - 2 * t);
      return [0.22 + 0.52 * e, 0.4 + 0.16 * Math.sin(t * Math.PI * 1.1)];
    },
  },
  create(studio: StudioGL): StudioInstance {
    const gl = studio.gl;
    const sim = studio.program(SIM_FS);
    const printPass = studio.program(PRINT_FS);
    const render = studio.program(RENDER_FS);
    let state = studio.pingPong(2, 2, { precision: "full" });
    let print = studio.target(2, 2, { precision: "byte" });
    let printKey = "";

    const resize = (f: StudioFrame): void => {
      const [w, h] = gridSize(f.aspect, studio.lowPower ? 160 : 256);
      if (state.read.width !== w || state.read.height !== h) {
        state = studio.pingPong(w, h, { precision: "full" });
        state.clear();
      }
      if (print.width !== f.width || print.height !== f.height) {
        print = studio.target(f.width, f.height, { precision: "byte" });
        printKey = "";
      }
    };

    // The print is redrawn only when its inputs change.
    const drawPrint = (f: StudioFrame): void => {
      const key = [f.width, f.height, f.light, param(f, "seed", 3), ...f.colors.flat()].join(",");
      if (key === printKey) return;
      printKey = key;
      const [paper, ink, accent] = [0, 1, 2].map((i) => f.colors[i] ?? ([0.5, 0.5, 0.5] as Vec3));
      print.bind();
      printPass
        .use()
        .frame(f)
        .set("uSeed", param(f, "seed", 3) * 0.37)
        .set("uPaper", paper ?? [0.8, 0.8, 0.8])
        .set("uInk", ink ?? [0.1, 0.1, 0.1])
        .set("uAccent", accent ?? [0.5, 0.2, 0.1]);
      studio.fullscreen();
    };

    return {
      resize,
      step(f) {
        resize(f);
        const total = f.dt * param(f, "speed", 1);
        const n = Math.max(1, Math.ceil(total / 1.25));
        gl.disable(gl.BLEND);
        for (let i = 0; i < n; i++) {
          state.write.bind();
          sim
            .use()
            .frame(f)
            .tex("uState", state.read.textures[0] ?? null, 0)
            .set("uTexel", [1 / state.read.width, 1 / state.read.height])
            .set("uDt", total / n)
            .set("uPress", param(f, "intensity", 1) * (f.coarse ? 1.15 : 1))
            .set("uLens", param(f, "scale", 1))
            .set("uSwirl", param(f, "swirl", 0.6))
            .set("uVisc", param(f, "viscosity", 1));
          studio.fullscreen();
          state.swap();
        }
      },
      draw(f) {
        resize(f);
        gl.disable(gl.BLEND);
        drawPrint(f);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, f.width, f.height);
        // The slab leaves a margin of print around it.
        const margin = Math.min(0.11, 0.07 + 0.03 / Math.max(f.aspect, 0.5));
        render
          .use()
          .frame(f)
          .tex("uState", state.read.textures[0] ?? null, 0)
          .tex("uPrint", print.textures[0] ?? null, 1)
          .set("uTexel", [1 / state.read.width, 1 / state.read.height])
          .set("uDisp", param(f, "dispersion", 1))
          .set("uTint", f.colors[3] ?? [0.8, 0.9, 0.85])
          .set("uSlabHalf", [f.aspect * 0.5 - margin * Math.min(1, f.aspect * 1.4), 0.5 - margin]);
        studio.fullscreen();
      },
      rest: () => state.clear(),
    };
  },
};
