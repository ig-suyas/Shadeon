import { DITHER, FBM, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_height;

${HASH}
${NOISE}
${FBM}
${SEED}
${DITHER}
// One curtain of light: a wavering lower edge with a long fade upwards,
// broken into vertical rays.
float curtain(vec2 uv, float x, float layer, float t) {
  float sway = fbm(vec2(x * 0.55 + t * (0.5 + layer * 0.15), layer * 3.3 + t * 0.25));
  float edge = u_height + layer * 0.11 + (sway - 0.5) * 0.5;
  float d = uv.y - edge;
  float body = smoothstep(-0.1, 0.03, d) * exp(-max(d, 0.0) * (5.5 - layer * 1.2));
  float rays = noise(vec2(x * 7.0 + sway * 5.0, t * 1.3 + layer * 2.0));
  return body * (0.45 + 0.55 * rays);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float x = (uv.x - 0.5) * (u_resolution.x / u_resolution.y) * u_scale;
  x += seedOffset(u_seed).x;
  float t = u_time * 0.18;

  // Night sky: darkest at the top.
  vec3 color = u_color1 * (1.0 - 0.55 * uv.y);

  color += u_color2 * curtain(uv, x, 0.0, t) * u_intensity;
  color += u_color3 * curtain(uv, x * 1.35 + 7.1, 1.0, t) * u_intensity * 0.85;
  color += u_color4 * curtain(uv, x * 1.8 + 15.4, 2.0, t) * u_intensity * 0.7;

  // Soft shoulder so overlapping curtains glow instead of clipping.
  color = 1.0 - exp(-color * 1.35);

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
