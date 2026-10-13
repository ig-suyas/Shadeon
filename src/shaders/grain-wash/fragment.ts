import { FBM, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_vignette;

${HASH}
${NOISE}
${FBM}
${SEED}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 offset = seedOffset(u_seed);
  float t = u_time * 0.08;

  // A slow wash of three tones.
  float a = fbm(p * 1.2 + offset + vec2(t, -t * 0.6));
  float b = fbm(p * 0.8 - offset + vec2(-t * 0.7, t));
  vec3 color = mix(u_color1, u_color2, smoothstep(0.25, 0.75, a));
  color = mix(color, u_color3, smoothstep(0.5, 0.9, b));

  // Film grain: a new pattern 24 times a second, strongest in the mid-tones.
  float frame = mod(floor(u_time * 24.0), 240.0);
  vec2 cell = floor(gl_FragCoord.xy / u_scale) + frame * vec2(13.0, 7.0);
  float grain = hash21(cell) - 0.5;
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color += grain * u_intensity * 0.4 * (1.0 - abs(luma - 0.5) * 0.8);

  color *= 1.0 - u_vignette * smoothstep(0.35, 1.1, length(p));

  gl_FragColor = vec4(color, 1.0);
}
`;
