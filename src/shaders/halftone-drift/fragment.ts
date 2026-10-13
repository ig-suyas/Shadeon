import { FBM, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_angle;

${HASH}
${NOISE}
${FBM}
${SEED}
mat2 rotate(float degrees) {
  float r = degrees * 0.01745329;
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

void main() {
  // A rotated grid of cells; u_scale is the number of dots across the height.
  float cell = u_resolution.y / u_scale;
  vec2 centred = gl_FragCoord.xy - 0.5 * u_resolution;
  vec2 grid = rotate(u_angle) * centred / cell;
  vec2 id = floor(grid) + 0.5;
  vec2 local = grid - id;

  // The tone is sampled once per dot, at the centre of the dot, like a printing screen.
  vec2 centre = rotate(-u_angle) * (id * cell) / u_resolution.y;
  float t = u_time * 0.12;
  float tone = fbm(centre * 1.6 + seedOffset(u_seed) + vec2(t, t * 0.4));
  tone = smoothstep(0.2, 0.8, tone + 0.12 * sin(centre.x * 3.0 + centre.y * 2.0 - t * 5.0));

  float radius = min(0.72, 0.55 * sqrt(tone) * u_intensity);
  float edge = 1.0 / cell;
  float coverage = 1.0 - smoothstep(radius - edge, radius + edge, length(local));

  vec3 ink = mix(u_color2, u_color3, tone);
  gl_FragColor = vec4(mix(u_color1, ink, coverage), 1.0);
}
`;
