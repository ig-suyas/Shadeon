import { DITHER, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

/**
 * Ink Bloom. The pointer pours ink into still water: it is carried along by
 * the pointer's motion, swirled by a slow curl-noise current, and marbles as
 * it spreads. Pigment pools darker at the edges of each plume, as real ink
 * does on wet paper. When idle (and on gallery cards) two wandering sources
 * keep feeding the water.
 *
 * Frame memory: pass 0 advects the ink (rgb = colour times amount, a =
 * amount) and adds new ink; pass 1 composites it over the paper.
 */
export const fragment = /* glsl */ `${HEADER}uniform vec2 u_pointer;
uniform vec2 u_velocity;
uniform float u_activity;
uniform float u_delta;
uniform sampler2D u_prev;
uniform float u_pass;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_swirl;

${HASH}
${NOISE}
${SEED}
${DITHER}
// A divergence-free current from the curl of a noise field.
vec2 current(vec2 p, float t) {
  const float e = 0.04;
  float n1 = noise(p + vec2(0.0, e) + t);
  float n2 = noise(p - vec2(0.0, e) + t);
  float n3 = noise(p + vec2(e, 0.0) + t);
  float n4 = noise(p - vec2(e, 0.0) + t);
  vec2 c = vec2(n1 - n2, n4 - n3) / (2.0 * e);
  // a second, larger octave for slow, broad turns
  vec2 q = p * 0.45 + 9.1;
  float m1 = noise(q + vec2(0.0, e) - t * 0.5);
  float m2 = noise(q - vec2(0.0, e) - t * 0.5);
  float m3 = noise(q + vec2(e, 0.0) - t * 0.5);
  float m4 = noise(q - vec2(e, 0.0) - t * 0.5);
  return c * 0.35 + vec2(m1 - m2, m4 - m3) / (2.0 * e) * 0.65;
}

// The ink colour for a source: walks through the three inks over time.
vec3 inkAt(float phase) {
  float k = fract(phase);
  vec3 a = mix(u_color2, u_color3, smoothstep(0.0, 0.5, k));
  return mix(a, u_color4, smoothstep(0.5, 1.0, k));
}

vec2 source(float t, float i) {
  return vec2(0.5 + 0.3 * sin(t * (0.17 + i * 0.05) + i * 2.4 + u_seed * 0.3),
              0.5 + 0.26 * sin(t * (0.23 - i * 0.04) + i * 1.3));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = uv * aspect;
  float t = u_time;
  vec2 offset = seedOffset(u_seed);

  if (u_pass < 0.5) {
    // The water: a slow current, plus the pointer dragging the water with it.
    vec2 flow = current(p * 2.6 * u_scale + offset, t * 0.1) * 0.26 * u_swirl;
    vec2 toPointer = p - u_pointer * aspect;
    float near = exp(-dot(toPointer, toPointer) * 70.0 / (u_intensity * u_intensity));
    flow += u_velocity * aspect * near * 0.9;
    // A gentle whirl around the pointer, so ink blooms into spirals.
    flow += vec2(-toPointer.y, toPointer.x) * near * 2.2 * clamp(u_activity * 1.5, 0.0, 1.0);
    vec2 back = uv - flow * u_delta / aspect;
    vec4 ink = texture2D(u_prev, back);
    // Very slow fading, and a touch of spreading at the edges.
    vec2 px = 1.0 / u_resolution;
    vec4 around = (texture2D(u_prev, back + vec2(px.x, 0.0)) + texture2D(u_prev, back - vec2(px.x, 0.0))
      + texture2D(u_prev, back + vec2(0.0, px.y)) + texture2D(u_prev, back - vec2(0.0, px.y))) * 0.25;
    ink = mix(ink, around, 0.025);
    ink *= pow(0.997, u_delta * 60.0);

    // New ink at the pointer, more when it moves.
    float pour = exp(-dot(toPointer, toPointer) * 1600.0 / (u_intensity * u_intensity));
    pour *= clamp(u_activity * 1.4, 0.0, 1.0) * (0.35 + min(length(u_velocity * aspect), 2.0));
    vec3 colour = inkAt(t * 0.035 + u_seed * 0.01);
    // Idle sources, so the water is never empty.
    float idle = 1.0 - clamp(u_activity * 2.0, 0.0, 1.0);
    vec4 add = vec4(colour, 1.0) * pour;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec2 d = p - source(t, fi) * aspect;
      float s = exp(-dot(d, d) * 700.0 / (u_intensity * u_intensity)) * idle * 0.8;
      add += vec4(inkAt(t * 0.03 + fi * 0.34), 1.0) * s;
    }
    ink += add * u_delta * 4.5;
    // Keep the amount bounded, so overlapping strokes stay translucent
    // instead of piling up into mud.
    ink *= 1.6 / max(ink.a, 1.6);
    gl_FragColor = ink;
    return;
  }

  vec4 ink = texture2D(u_prev, uv);
  float amount = ink.a;
  vec3 hue = ink.rgb / max(amount, 1e-4);
  // Pigment pools at the edge of a plume: darker where the amount changes fast.
  vec2 px = 2.0 / u_resolution;
  float gx = texture2D(u_prev, uv + vec2(px.x, 0.0)).a - texture2D(u_prev, uv - vec2(px.x, 0.0)).a;
  float gy = texture2D(u_prev, uv + vec2(0.0, px.y)).a - texture2D(u_prev, uv - vec2(0.0, px.y)).a;
  float rim = clamp(length(vec2(gx, gy)) * 2.5, 0.0, 1.0);

  bool light = dot(u_color1, vec3(0.299, 0.587, 0.114)) > 0.5;
  float cover = 1.0 - exp(-amount * 2.2);
  vec3 col;
  if (light) {
    // On paper, ink absorbs: multiply, with darker pooled edges.
    vec3 stain = mix(vec3(1.0), hue, cover);
    col = u_color1 * stain * (1.0 - rim * 0.35 * cover);
  } else {
    // In dark water, ink glows faintly and its edges catch the light.
    col = mix(u_color1, hue * (0.55 + 0.45 * cover), cover);
    col += hue * rim * 0.25;
  }
  // Paper (or water) grain, and a soft vignette.
  float grain = noise(gl_FragCoord.xy * 0.7) * 0.6 + hash21(gl_FragCoord.xy) * 0.4;
  col *= 0.97 + 0.05 * grain;
  vec2 v = uv - 0.5;
  col *= 1.0 - dot(v, v) * (light ? 0.18 : 0.45);
  gl_FragColor = vec4(dither(clamp(col, 0.0, 1.0)), 1.0);
}
`;
