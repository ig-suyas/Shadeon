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
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * 0.1;
  float s = seedOffset(u_seed).x;

  // The pivot wanders, and the plane is bent a little so the sweep is not a perfect pie.
  vec2 d = p - 0.2 * vec2(sin(t * 0.9 + s), cos(t * 0.7 + s * 1.4));
  d += (vec2(noise(p * 1.4 + vec2(t, s)), noise(p * 1.4 + vec2(s, -t))) - 0.5) * 0.45 * u_intensity;

  // Colour follows the angle around the pivot, twisted a little with distance.
  float r = length(d);
  float turn = atan(d.y, d.x) / 6.2831853 + t * 0.35 + r * 0.3 * u_scale;
  vec3 color = palette(turn);

  // Close to the pivot all colours meet; blend to their average there instead of a pinch.
  vec3 average = (u_color1 + u_color2 + u_color3 + u_color4) * 0.25;
  color = mix(average, color, smoothstep(0.0, 0.22, r));

  color += (hash21(gl_FragCoord.xy) - 0.5) * 0.03;
  gl_FragColor = vec4(color, 1.0);
}
`;
