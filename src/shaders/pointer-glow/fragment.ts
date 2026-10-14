import { DITHER, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec2 u_pointer;     // 0..1, origin bottom-left
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;

${HASH}
${NOISE}
${SEED}
${DITHER}
// Height of a softly uneven wall: rotated sine ridges, bent by low-frequency
// noise. Built from sines rather than raw value noise, because lighting value
// noise shows its square lattice.
float relief(vec2 p, vec2 o) {
  vec2 bend = vec2(noise(p * 0.35 + o), noise(p * 0.35 + o + 7.3)) * 2.4;
  vec2 q = p + bend;
  float h = sin(dot(q, vec2(0.91, 0.42)) * 1.7);
  h += sin(dot(q, vec2(-0.38, 0.93)) * 2.3 + 1.3) * 0.6;
  h += sin(dot(q, vec2(0.62, -0.78)) * 3.1 + 2.9) * 0.35;
  return h;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = (uv - 0.5) * aspect;
  vec2 toLight = (u_pointer - 0.5) * aspect - p;
  float t = u_time * 0.05;

  // Surface normal of the wall from three height samples.
  vec2 o = seedOffset(u_seed);
  vec2 w = p * 6.0 * u_scale + vec2(t, -t * 0.6);
  float e = 0.02;
  float h = relief(w, o);
  vec3 n = normalize(vec3(
    (h - relief(w + vec2(e, 0.0), o)) / e,
    (h - relief(w + vec2(0.0, e), o)) / e,
    2.2
  ));

  // A lamp held just above the wall at the pointer: light rakes across the
  // ridges near it and fades with distance.
  float d2 = dot(toLight, toLight);
  vec3 lamp = normalize(vec3(toLight, 0.3));
  float reach = 1.0 / (1.0 + d2 * 14.0 / u_intensity);
  float raked = max(dot(n, lamp), 0.0);

  // Faint ambient shading so the wall keeps its shape out of the lamp.
  vec3 color = u_color1 * (0.75 + 0.5 * n.x);
  color += u_color2 * raked * reach * 1.6;
  // The lamp itself: a soft core.
  color += u_color3 * exp(-d2 * 70.0) * 0.3;

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
