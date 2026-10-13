import { DITHER, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec2 u_pointer;     // 0..1, origin bottom-left
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;

${HASH}
${NOISE}
${SEED}
${DITHER}
// Rings spreading from one point, fading with distance.
float rings(vec2 p, vec2 centre, float t) {
  float d = length(p - centre);
  // Calm at the very centre, so a source does not turn into a busy knot.
  float envelope = smoothstep(0.0, 0.04, d) * exp(-d * 1.7) / (1.0 + d * 2.0);
  return sin(d * 17.0 * u_scale - t * 3.2) * envelope;
}

// Water height: rings from the pointer and from two wandering drops, plus a gentle chop.
float water(vec2 p, vec2 pointer, float t, float seed) {
  vec2 dropA = vec2(sin(t * 0.31 + seed) * 0.7, cos(t * 0.23 + seed * 1.3) * 0.4);
  vec2 dropB = vec2(cos(t * 0.19 + 2.0 + seed) * 0.8, sin(t * 0.27 + 1.0) * 0.45);
  float h = rings(p, pointer, t);
  h += rings(p, dropA, t * 0.9 + 1.0);
  h += rings(p, dropB, t * 1.1 + 2.0);
  h += (noise(p * 3.0 + vec2(t * 0.25, -t * 0.2)) - 0.5) * 0.06;
  return h;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = (uv - 0.5) * aspect;
  vec2 pointer = (u_pointer - 0.5) * aspect;
  float seed = seedOffset(u_seed).x;
  float t = u_time;

  float e = 0.004;
  float h = water(p, pointer, t, seed);
  vec3 n = normalize(vec3(
    h - water(p + vec2(e, 0.0), pointer, t, seed),
    h - water(p + vec2(0.0, e), pointer, t, seed),
    e * 5.0 / u_intensity
  ));

  // The pool floor, seen through the bent surface.
  vec2 seen = uv + n.xy * 0.07;
  float depth = seen.y + (noise(seen * 3.0 + seed) - 0.5) * 0.35;
  vec3 color = mix(u_color1, u_color2, smoothstep(0.0, 1.0, depth));

  // Light from the upper left: soft shading, a sharp glint, and a pale rim on steep slopes.
  vec3 light = normalize(vec3(-0.4, 0.6, 0.7));
  color *= 0.84 + 0.22 * dot(n, light);
  float glint = pow(max(dot(reflect(-light, n), vec3(0.0, 0.0, 1.0)), 0.0), 48.0);
  color += u_color3 * glint * 0.85;
  color += u_color4 * pow(1.0 - n.z, 2.0) * 0.35;

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
