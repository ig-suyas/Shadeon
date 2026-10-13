import { HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;

${HASH}
${NOISE}
${SEED}
// A soft elliptical glow.
float glow(vec2 p, vec2 centre, vec2 stretch) {
  vec2 d = (p - centre) * stretch * u_scale;
  return exp(-dot(d, d));
}

// Screen blend: light adds up without clipping, as it does on film.
vec3 screen(vec3 base, vec3 light) {
  return 1.0 - (1.0 - base) * (1.0 - clamp(light, 0.0, 1.0));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = (uv - 0.5) * aspect;
  float t = u_time * 0.12;
  float s = seedOffset(u_seed).x;

  // Bend space a little so the glows are not perfect ellipses.
  p += (vec2(noise(p * 1.1 + vec2(t, s)), noise(p * 1.1 + vec2(s, -t))) - 0.5) * 0.35;

  // Three leaks of light, entering from the left, the upper right and below.
  vec2 a = vec2(-0.55 * aspect.x + 0.2 * sin(t * 0.9 + s), 0.22 * sin(t * 0.7 + s * 1.3));
  vec2 b = vec2(0.5 * aspect.x + 0.18 * cos(t * 0.6 + s * 2.0), 0.4 + 0.12 * sin(t * 0.8));
  vec2 c = vec2(0.15 * sin(t * 0.5 + s), -0.55 + 0.1 * cos(t * 0.9 + s));

  vec3 color = u_color1;
  color = screen(color, u_color2 * glow(p, a, vec2(1.2, 0.8)) * u_intensity);
  color = screen(color, u_color3 * glow(p, b, vec2(1.0, 1.3)) * u_intensity * 0.9);
  color = screen(color, u_color4 * glow(p, c, vec2(0.7, 1.6)) * u_intensity * 0.8);

  // Fine grain keeps the gradients from banding and gives the film feel.
  color += (hash21(gl_FragCoord.xy + mod(floor(u_time * 24.0), 64.0) * 7.0) - 0.5) * 0.035;

  gl_FragColor = vec4(color, 1.0);
}
`;
