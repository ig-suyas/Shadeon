import { FBM, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

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
${FBM}
${SEED}
// One layer of stars: at most one star per grid cell, kept away from the cell
// edges so its glow never gets cut off.
float stars(vec2 p, float density, float layer, float t) {
  vec2 grid = p * density;
  vec2 id = floor(grid);
  vec2 local = fract(grid);
  vec2 key = id + layer * 37.0;
  float h = hash21(key);
  vec2 position = 0.25 + 0.5 * vec2(hash21(key + 3.1), hash21(key + 7.7));
  // Most stars are faint; a few are bright.
  float brightness = pow(h, 5.0);
  float radius = 0.035 + 0.16 * brightness;
  float d = length(local - position);
  float glow = smoothstep(radius, 0.0, d);
  float twinkle = 0.65 + 0.35 * sin(t * (1.5 + h * 4.0) + h * 40.0);
  return glow * glow * (0.25 + brightness) * twinkle;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 offset = seedOffset(u_seed);
  vec2 lean = (u_pointer - 0.5) * 0.12;
  float t = u_time;

  // Sky: a vertical gradient with a faint drifting cloud of dust.
  vec3 color = mix(u_color1, u_color2, smoothstep(-0.5, 0.6, p.y));
  float dust = fbm(p * 1.4 + offset + vec2(t * 0.01, 0.0));
  color += u_color4 * smoothstep(0.45, 0.95, dust) * 0.35;

  // Three depths: near stars are larger, move faster and lean more with the pointer.
  float light = 0.0;
  light += stars(p + offset + vec2(t * 0.004, 0.0) + lean * 0.3, 26.0 * u_scale, 0.0, t) * 0.6;
  light += stars(p + offset + vec2(t * 0.009, 0.0) + lean * 0.6, 14.0 * u_scale, 1.0, t) * 0.85;
  light += stars(p + offset + vec2(t * 0.016, 0.0) + lean, 7.0 * u_scale, 2.0, t);
  color += u_color3 * light * u_intensity * 1.6;

  gl_FragColor = vec4(color, 1.0);
}
`;
