import { HASH, HEADER, NOISE, SEED, SOFT_SCENE } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_frost;

${HASH}
${NOISE}
${SEED}
${SOFT_SCENE}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.1;

  // Frosted glass scatters light: every point shows the scene from a slightly
  // different place. A fine noise field decides where.
  vec2 grain = gl_FragCoord.xy / u_resolution.y * u_frost;
  vec2 scatter = vec2(noise(grain), noise(grain + 31.7)) - 0.5;
  vec3 color = softScene(uv + scatter * 0.07 * u_intensity, t);

  // A soft diagonal sheen where the pane catches the room light.
  float band = uv.x + uv.y * 0.6 - 0.75 - 0.15 * sin(t * 0.8);
  color += (1.0 - color) * exp(-band * band * 9.0) * 0.09;

  color += (hash21(gl_FragCoord.xy) - 0.5) * 0.03;
  gl_FragColor = vec4(color, 1.0);
}
`;
