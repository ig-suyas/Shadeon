import { DITHER, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_angle;

${HASH}
${NOISE}
${SEED}
${DITHER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float r = u_angle * 0.01745329;
  vec2 q = vec2(cos(r) * p.x + sin(r) * p.y, -sin(r) * p.x + cos(r) * p.y);
  float t = u_time * 0.1;
  float s = seedOffset(u_seed).x;

  // Pleats run along one axis; their edges wander slowly so the sheet seems to breathe.
  float x = q.x * u_scale * 5.0 + (noise(vec2(q.y * 0.9 + s, t)) - 0.5) * 0.9 * u_intensity;
  float pleat = floor(x);
  float f = fract(x);

  // Each pleat has a face turned to the light and a narrower face in shade.
  float bright = mix(0.8, 1.0, smoothstep(0.0, 0.62, f));
  float shade = mix(0.55, 0.74, smoothstep(0.62, 1.0, f));
  float tone = mix(bright, shade, smoothstep(0.6, 0.66, f));
  // Soften the valley between one pleat and the next.
  tone = mix(0.76, tone, smoothstep(0.0, 0.05, f));

  // Paper colour drifts gently from pleat to pleat and along their length.
  float tint = noise(vec2(pleat * 0.37 + s, q.y * 0.6 + t * 0.5));
  vec3 paper = mix(u_color1, u_color2, smoothstep(0.2, 0.8, tint));
  vec3 color = paper * tone;
  // A fine highlight along each ridge.
  float ridge = f - 0.62;
  color += u_color3 * exp(-ridge * ridge * 1800.0) * 0.14;

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
