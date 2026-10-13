import { DITHER, HASH, HEADER, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;

${HASH}
${SEED}
${DITHER}
// One depth of out-of-focus lights. Each grid cell holds one disc, which may
// spill into its neighbours, so the eight surrounding cells are checked too.
vec3 lights(vec2 p, float cells, float layer, float t) {
  vec2 grid = p * cells;
  vec2 id = floor(grid);
  vec3 sum = vec3(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 cell = id + vec2(float(x), float(y));
      vec2 key = cell + layer * 19.0;
      float h = hash21(key);
      float k = hash21(key + 5.3);
      // Each light bobs slowly around its place in the cell.
      vec2 centre = cell + 0.5 + 0.32 * vec2(
        sin(t * (0.3 + h * 0.4) + h * 30.0),
        cos(t * (0.25 + k * 0.4) + k * 30.0)
      );
      float radius = 0.28 + 0.3 * k;
      float d = length(grid - centre) / radius;
      // A flat disc with a slightly brighter rim, the look of a defocused point of light.
      float disc = smoothstep(1.0, 0.86, d);
      float rim = smoothstep(0.7, 0.98, d) * disc;
      float pulse = 0.7 + 0.3 * sin(t * 0.6 + h * 20.0);
      // Only some cells are lit, which leaves dark gaps between the lights.
      float lit = step(0.35, h);
      sum += mix(u_color3, u_color4, k) * (disc * 0.5 + rim * 0.35) * pulse * lit;
    }
  }
  return sum;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 offset = seedOffset(u_seed);
  float t = u_time * 0.5;

  vec3 color = mix(u_color1, u_color2, smoothstep(-0.5, 0.6, p.y));
  // Far lights are small and dim, near ones large and bright; each depth drifts at its own pace.
  color += lights(p + offset + vec2(t * 0.012, 0.0), 4.2 * u_scale, 0.0, t) * 0.35 * u_intensity;
  color += lights(p + offset * 1.7 + vec2(-t * 0.02, t * 0.006), 2.6 * u_scale, 1.0, t) * 0.5 * u_intensity;
  color += lights(p - offset + vec2(t * 0.03, -t * 0.008), 1.5 * u_scale, 2.0, t) * 0.6 * u_intensity;

  // Roll off the brightest overlaps instead of clipping them.
  color = 1.0 - exp(-color * 1.25);

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
