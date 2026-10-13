import { HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_curve;

${HASH}
${NOISE}
${SEED}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;

  // Bulge the picture slightly, as the glass of a tube does.
  vec2 centred = uv * 2.0 - 1.0;
  centred *= 1.0 + u_curve * 0.09 * dot(centred, centred);
  vec2 screen = centred * 0.5 + 0.5;
  float inside = smoothstep(0.0, 0.02, min(min(screen.x, 1.0 - screen.x), min(screen.y, 1.0 - screen.y)));

  // The picture: a slow, soft wash of colour.
  vec2 p = (screen - 0.5) * vec2(aspect, 1.0);
  float t = u_time * 0.08;
  vec2 offset = seedOffset(u_seed);
  float a = noise(p * 1.4 + offset + vec2(t, -t * 0.7));
  float b = noise(p * 0.9 - offset + vec2(-t * 0.6, t));
  vec3 color = mix(u_color1, u_color2, smoothstep(0.2, 0.8, a));
  color = mix(color, u_color3, smoothstep(0.55, 0.95, b) * 0.8);

  // Scanlines, u_scale device pixels apart.
  float line = 0.5 + 0.5 * cos(screen.y * u_resolution.y / u_scale * 6.2831853);
  color *= mix(1.0, 0.5 + 0.5 * line, u_intensity);
  // A faint brighter band rolls slowly up the screen.
  float band = fract(screen.y - u_time * 0.05) - 0.5;
  color += color * exp(-band * band * 40.0) * 0.18;
  // Phosphor stripes: red, green and blue columns take turns being slightly brighter.
  float column = mod(gl_FragCoord.x, 3.0);
  vec3 stripe = vec3(step(column, 1.0), step(1.0, column) * step(column, 2.0), step(2.0, column));
  color *= 0.9 + 0.16 * stripe * u_intensity;

  // Darker corners, and nothing outside the tube.
  color *= 1.0 - 0.3 * dot(centred, centred) * 0.5;
  color *= inside;

  gl_FragColor = vec4(color, 1.0);
}
`;
