import { DITHER, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

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
${DITHER}
// Four colours on a loop, eased between neighbours.
vec3 palette(float x) {
  x = fract(x) * 4.0;
  float f = smoothstep(0.0, 1.0, fract(x));
  if (x < 1.0) return mix(u_color1, u_color2, f);
  if (x < 2.0) return mix(u_color2, u_color3, f);
  if (x < 3.0) return mix(u_color3, u_color4, f);
  return mix(u_color4, u_color1, f);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float x = (uv.x - 0.5) * u_resolution.x / u_resolution.y * u_scale;
  float t = u_time * 0.12;
  float s = seedOffset(u_seed).x;

  // Tall bars of colour whose edges sway: the position along the palette
  // depends on x, pushed around by slow waves and a lean that varies with height.
  float lean = (noise(vec2(uv.y * 1.3 + s, t * 0.8)) - 0.5) * 0.5 * u_intensity;
  float along = x * 0.9 + lean
    + 0.3 * sin(x * 2.3 + t * 1.1 + s)
    + 0.14 * sin(x * 5.1 - t * 0.7 + s * 2.0);
  vec3 color = palette(along * 0.5 + t * 0.05);

  // Brighter through the middle, like light coming through tall blinds.
  color *= 0.84 + 0.16 * sin(uv.y * 3.14159265);

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
