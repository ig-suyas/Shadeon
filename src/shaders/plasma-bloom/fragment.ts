import { DITHER, HASH, HEADER, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_bands;

${HASH}
${SEED}
${DITHER}
// Four colours on a loop, eased between neighbours.
vec3 palette(float x) {
  x = fract(x) * 4.0;
  float f = smoothstep(0.0, 1.0, fract(x));
  if (x < 1.0) return mix(u_color1, u_color2, f);
  if (x < 2.0) return mix(u_color2, u_color3, f);
  if (x < 3.0) return mix(u_color3, u_color4, f);
  return mix(u_color4, u_color1, f);
}

// Sum of travelling sine waves: the classic plasma field, about -1..1.
float field(vec2 p, float t) {
  vec2 orbit = vec2(sin(t * 0.5), cos(t * 0.4)) * 1.5;
  return 0.25 * (
    sin(p.x * 1.3 + t)
    + sin(p.y * 1.7 - t * 1.2)
    + sin((p.x + p.y) * 1.1 + t * 0.7)
    + sin(length(p - orbit) * 2.2 - t * 1.5)
  );
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) * u_scale * 3.0;
  p += seedOffset(u_seed) * 0.37;
  float t = u_time * 0.4;

  // Bend the plane with itself before sampling, so the bands swirl instead of marching.
  vec2 bent = p + u_intensity * 0.7 * vec2(
    sin(p.y * 1.4 + t * 0.9),
    cos(p.x * 1.2 - t * 0.8)
  );
  float v = field(bent, t) + 0.35 * field(bent * 2.1 + 3.0, t * 1.3);

  vec3 color = palette(v * 0.5 * u_bands + t * 0.04);
  gl_FragColor = vec4(dither(color), 1.0);
}
`;
