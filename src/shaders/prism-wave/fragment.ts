import { HASH, HEADER, NOISE, SEED, SOFT_SCENE } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_spread;

${HASH}
${NOISE}
${SEED}
${SOFT_SCENE}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.1;
  float s = seedOffset(u_seed).y;

  // Rippled glass: the sideways shift of what is seen through it follows
  // slow waves running down the pane.
  float wave = sin(uv.y * 5.0 + t * 1.6 + s) * 0.55
    + sin(uv.y * 11.0 - t * 1.1 + s * 2.0) * 0.25
    + (noise(vec2(uv.y * 2.5 + s, t * 0.8)) - 0.5) * 0.6;
  float shift = wave * 0.07 * u_intensity;

  // Glass bends each colour of light by a different amount, so red, green and
  // blue are each looked up at a slightly different shift.
  float split = 0.4 * u_spread;
  float red = softScene(uv + vec2(shift * (1.0 - split), 0.0), t).r;
  float green = softScene(uv + vec2(shift, 0.0), t).g;
  float blue = softScene(uv + vec2(shift * (1.0 + split), 0.0), t).b;
  vec3 color = vec3(red, green, blue);

  // Crests of the ripples catch a little light.
  color += (1.0 - color) * smoothstep(0.55, 1.0, wave) * 0.07;

  color += (hash21(gl_FragCoord.xy) - 0.5) * 0.025;
  gl_FragColor = vec4(color, 1.0);
}
`;
