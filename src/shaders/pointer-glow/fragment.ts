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
// Height of a softly uneven wall.
float relief(vec2 p) {
  return noise(p) * 0.7 + noise(p * 2.3 + 5.0) * 0.3;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = (uv - 0.5) * aspect;
  vec2 toLight = (u_pointer - 0.5) * aspect - p;
  float t = u_time * 0.05;

  // Surface normal of the wall from three height samples.
  vec2 w = p * 3.2 * u_scale + seedOffset(u_seed) + vec2(t, -t * 0.6);
  float e = 0.04;
  float h = relief(w);
  vec3 n = normalize(vec3(h - relief(w + vec2(e, 0.0)), h - relief(w + vec2(0.0, e)), e * 2.2));

  // A lamp held just above the wall at the pointer: light rakes across the
  // bumps near it and fades with distance.
  vec3 lamp = normalize(vec3(toLight, 0.3));
  float reach = 1.0 / (1.0 + dot(toLight, toLight) * 6.0 / u_intensity);
  float raked = max(dot(n, lamp), 0.0);

  vec3 color = u_color1;
  color += u_color2 * raked * reach * 1.5;
  // The lamp itself: a small warm core.
  color += u_color3 * exp(-dot(toLight, toLight) * 26.0) * 0.45;

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
