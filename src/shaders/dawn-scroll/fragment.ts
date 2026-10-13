import { DITHER, FBM, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform float u_scroll;     // 0..1, how far the page has scrolled
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_offset;

${HASH}
${NOISE}
${FBM}
${SEED}
${DITHER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  float t = u_time * 0.03;

  // Time of day: 0 is the last of the night, 1 is full morning.
  // Scrolling the page moves it forward.
  float day = clamp(u_scroll + u_offset, 0.0, 1.0);
  float light = smoothstep(0.1, 0.95, day);

  // Sky: the zenith colour above, the horizon colour pooling at the bottom.
  vec3 zenith = mix(u_color1, u_color3, light);
  vec3 horizon = mix(u_color2, mix(u_color3, vec3(1.0), 0.45), smoothstep(0.55, 1.0, day));
  float low = pow(1.0 - uv.y, 2.2);
  vec3 color = mix(zenith, horizon, low);

  // The sun climbs from below the frame, with a tight core and a wide glow.
  vec2 sun = vec2(0.64, mix(-0.12, 0.74, day));
  vec2 d = (uv - sun) * vec2(aspect, 1.0);
  float r = length(d);
  float glow = 0.85 * exp(-r * r * 46.0) + 0.38 * exp(-r * 3.4);
  color += u_color4 * glow * u_intensity * smoothstep(0.0, 0.3, day);

  // Thin bands of haze drifting near the horizon.
  float haze = fbm(vec2(uv.x * aspect * 1.1 * u_scale + t + seedOffset(u_seed).x, uv.y * 7.0 * u_scale));
  color = mix(color, horizon, smoothstep(0.5, 0.9, haze) * low * 0.55);

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
