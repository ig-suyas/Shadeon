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
// Height of the crest of one ribbon at horizontal position x.
float crest(float x, float layer, float t, float seed) {
  float phase = layer * 1.9 + seed;
  float wave = sin(x * (1.1 + layer * 0.35) + t * (0.9 + layer * 0.22) + phase) * 0.6
    + sin(x * (2.3 + layer * 0.5) - t * 0.7 + phase * 1.7) * 0.25
    + (noise(vec2(x * 0.8 + phase, t * 0.4 + layer)) - 0.5) * 0.5;
  return wave * 0.11 * u_intensity;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * u_scale;
  float t = u_time * 0.35;
  float seed = seedOffset(u_seed).x;
  float pixel = 1.5 * u_scale / u_resolution.y;

  // Back to front: each ribbon covers everything below its crest.
  vec3 color = u_color1;
  for (int i = 0; i < 6; i++) {
    float layer = float(i);
    float depth = layer / 5.0;
    float base = (0.34 - depth * 0.72) * u_scale;
    float below = base + crest(p.x, layer, t, seed) * u_scale - p.y;
    float mask = smoothstep(0.0, pixel, below);
    // Bright along the crest, falling off into the fold beneath it.
    float sheen = exp(-max(below, 0.0) * 7.0 / u_scale);
    vec3 ribbon = mix(u_color2, u_color3, depth);
    ribbon = mix(ribbon * 0.82, ribbon + u_color4 * 0.4, sheen);
    color = mix(color, ribbon, mask);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;
