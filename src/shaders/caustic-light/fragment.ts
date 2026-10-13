import { DITHER, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;

${HASH}
${NOISE}
${SEED}
${DITHER}
// Bright where noise crosses its midpoint: thin wandering lines.
float ridge(vec2 p) {
  return 1.0 - abs(2.0 * noise(p) - 1.0);
}

// A net of light: where two sets of lines cross and run together.
float net(vec2 p, float t) {
  vec2 sway = vec2(noise(p * 1.2 + vec2(t, 3.1)), noise(p * 1.2 + vec2(7.3, -t))) - 0.5;
  vec2 q = p + sway * 0.7;
  float a = ridge(q * 1.5 + vec2(t * 0.6, 0.0));
  float b = ridge(q * 1.9 + vec2(4.0, -t * 0.5));
  return pow(a * b, 5.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) * u_scale * 3.0;
  p += seedOffset(u_seed);
  float t = u_time * 0.22;

  // Two nets at different sizes, drifting against each other, like sunlight
  // focused onto the floor of a pool by the moving surface above.
  float light = net(p, t) + 0.6 * net(p * 1.7 + 9.0, -t * 0.8);

  // Water colour deepens towards the bottom of the frame.
  vec3 water = mix(u_color1, u_color2, smoothstep(0.0, 1.0, uv.y * 0.8 + 0.2 * noise(p * 0.4 + t)));
  vec3 color = water + u_color3 * light * u_intensity * 1.05;

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
