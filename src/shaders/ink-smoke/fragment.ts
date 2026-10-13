import { DITHER, FBM, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;

${HASH}
${NOISE}
${FBM}
${SEED}
${DITHER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) * u_scale * 1.6;
  p += seedOffset(u_seed);
  float t = u_time * 0.06;

  // Fold the plane through noise twice. Each fold makes the next one curl,
  // which is what gives smoke and ink their trailing, billowing shapes.
  vec2 first = vec2(
    fbm(p + vec2(0.0, t)),
    fbm(p + vec2(5.2, 1.3 - t))
  );
  vec2 second = vec2(
    fbm(p + 3.0 * u_intensity * first + vec2(1.7 - t * 0.7, 9.2)),
    fbm(p + 3.0 * u_intensity * first + vec2(8.3, 2.8 + t * 0.6))
  );
  float density = fbm(p + 3.2 * u_intensity * second);

  // Colour by how dense the smoke is and by how far each fold pushed.
  vec3 color = mix(u_color1, u_color2, smoothstep(0.2, 0.75, density));
  color = mix(color, u_color3, smoothstep(0.35, 0.95, length(second)) * 0.7);
  color = mix(color, u_color4, smoothstep(0.55, 0.95, first.x * density * 2.0) * 0.6);

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
