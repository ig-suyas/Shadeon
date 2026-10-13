import { FBM, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec2 u_pointer;     // 0..1, origin bottom-left
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_levels;

${HASH}
${NOISE}
${FBM}
${SEED}
// Terrain height at a point. The pointer raises a soft hill under itself.
float terrain(vec2 p, vec2 pointer, float t) {
  float h = fbm(p * 0.8 + vec2(t, t * 0.6));
  vec2 d = p - pointer;
  return h + 0.22 * exp(-dot(d, d) * 2.5);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 offset = seedOffset(u_seed);
  vec2 p = (uv - 0.5) * aspect * u_scale + offset;
  vec2 pointer = (u_pointer - 0.5) * aspect * u_scale + offset;
  float t = u_time * 0.05;

  // Height here and one pixel away in x and y: the slope tells us how many
  // contour levels a pixel spans, which keeps lines an even width on screen.
  float px = u_scale / u_resolution.y;
  float h = terrain(p, pointer, t);
  float hx = terrain(p + vec2(px, 0.0), pointer, t);
  float hy = terrain(p + vec2(0.0, px), pointer, t);
  float level = h * u_levels;
  float slope = max(length(vec2(hx - h, hy - h)) * u_levels, 1e-5);

  float nearest = floor(level + 0.5);
  float distPx = abs(level - nearest) / slope;
  float major = 1.0 - step(0.5, mod(nearest, 5.0));
  float width = u_intensity * (0.5 + 0.5 * major);
  float line = 1.0 - smoothstep(width, width + 1.0, distPx);

  vec3 color = mix(u_color1, u_color3, smoothstep(0.25, 0.85, h) * 0.22);
  color = mix(color, mix(u_color2, u_color3, major), line);

  gl_FragColor = vec4(color, 1.0);
}
`;
