/**
 * Shared GLSL building blocks, written for Shadeon. Fragments compose these
 * with template literals, so every exported shader is one complete source.
 * All code targets GLSL ES 1.00 (runs on WebGL1 and WebGL2).
 */

/** Precision plus the uniforms the runtime always provides. */
export const HEADER = /* glsl */ `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float u_time;       // seconds, already scaled by speed
uniform vec2 u_resolution;  // canvas size in pixels
`;

/**
 * Sine-free hash, 2D in, 0..1 out. Uses the common fract/dot construction
 * (no trigonometry, so results match across GPUs); constants are our own.
 */
export const HASH = /* glsl */ `float hash21(vec2 p) {
  vec3 q = fract(p.xyx * vec3(0.1379, 0.2137, 0.1731));
  q += dot(q, q.yzx + 31.73);
  return fract((q.x + q.y) * q.z);
}
`;

/** Value noise with quintic interpolation, 0..1. Needs HASH. */
export const NOISE = /* glsl */ `float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
`;

/** Four octaves of value noise, rotated between octaves, about 0..1. Needs NOISE. */
export const FBM = /* glsl */ `float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  mat2 turn = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p = turn * p * 2.03 + 11.7;
    amp *= 0.5;
  }
  return sum / 0.9375;
}
`;

/** Stable 2D offset derived from u_seed, small enough for mediump floats. */
export const SEED = /* glsl */ `vec2 seedOffset(float seed) {
  return vec2(fract(seed * 0.1731), fract(seed * 0.2913)) * 64.0;
}
`;

/** Breaks up 8-bit colour banding in smooth gradients. Needs HASH. */
export const DITHER = /* glsl */ `vec3 dither(vec3 color) {
  return color + (hash21(gl_FragCoord.xy) - 0.5) / 255.0;
}
`;

/**
 * A soft colour scene for shaders that look at something through glass: four
 * colours, each pulling on a point by its distance to a slowly wandering
 * anchor, read through a gentle noise warp. Needs NOISE and SEED, and the
 * uniforms u_color1..u_color4, u_resolution, u_scale and u_seed.
 */
export const SOFT_SCENE = /* glsl */ `vec2 sceneAnchor(float t, float phase, vec2 rate, vec2 aspect) {
  return 0.42 * aspect * vec2(sin(t * rate.x + phase), cos(t * rate.y + phase * 1.37));
}

vec3 softScene(vec2 uv, float t) {
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = (uv - 0.5) * aspect;
  vec2 n = p * u_scale + seedOffset(u_seed);
  vec2 warp = vec2(
    noise(n + vec2(t, -t * 0.7)),
    noise(n + vec2(5.2 - t * 0.6, 1.3 + t))
  ) - 0.5;
  vec2 q = p + warp * 0.85;
  float phase = u_seed * 1.7;
  vec2 d1 = q - sceneAnchor(t, phase, vec2(1.3, 1.1), aspect);
  vec2 d2 = q - sceneAnchor(t, phase + 2.1, vec2(0.9, 1.4), aspect);
  vec2 d3 = q - sceneAnchor(t, phase + 4.2, vec2(1.1, 0.8), aspect);
  vec2 d4 = q - sceneAnchor(t, phase + 5.5, vec2(0.7, 1.2), aspect);
  float w1 = exp(-dot(d1, d1) * 4.6);
  float w2 = exp(-dot(d2, d2) * 4.6);
  float w3 = exp(-dot(d3, d3) * 4.6);
  float w4 = exp(-dot(d4, d4) * 4.6);
  return (u_color1 * w1 + u_color2 * w2 + u_color3 * w3 + u_color4 * w4)
    / (w1 + w2 + w3 + w4 + 1e-4);
}
`;
