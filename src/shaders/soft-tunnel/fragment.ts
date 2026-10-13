import { DITHER, HASH, HEADER, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_spokes;

${HASH}
${SEED}
${DITHER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * 0.25;
  float s = seedOffset(u_seed).x;

  // The vanishing point wanders a little, so the tunnel seems to bend ahead.
  p -= 0.07 * vec2(sin(t * 0.6 + s), cos(t * 0.46 + s * 1.7));

  // Distance from the centre becomes depth; the angle wraps around the wall.
  float r = length(p);
  float angle = atan(p.y, p.x);
  float depth = 0.55 * u_scale / (r + 0.04) + t;
  float spokes = floor(u_spokes + 0.5);

  // Soft rings travelling towards the viewer, crossed by twisting ribs.
  float rings = 0.5 + 0.5 * sin(depth * 6.2831853);
  float ribs = 0.5 + 0.5 * sin(angle * spokes + depth * 1.4 * u_intensity);
  float wall = smoothstep(0.3, 0.7, rings * 0.7 + ribs * 0.3);

  vec3 color = mix(u_color1, u_color2, wall);
  color = mix(color, u_color3, smoothstep(0.82, 1.0, rings) * (0.35 + 0.4 * ribs));

  // Light at the far end, and a gentle fall-off towards the mouth.
  color = mix(u_color4, color, smoothstep(0.02, 0.26, r));
  color *= 1.0 - 0.35 * smoothstep(0.5, 1.1, r);

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
