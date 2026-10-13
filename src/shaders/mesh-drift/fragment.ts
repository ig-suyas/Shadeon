import { DITHER, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec2 u_pointer;     // 0..1, origin bottom-left
uniform vec3 u_color1;
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
// A colour anchor that wanders on a slow looping path.
vec2 anchor(float t, float phase, vec2 rate, vec2 aspect) {
  return 0.52 * aspect * vec2(sin(t * rate.x + phase), cos(t * rate.y + phase * 1.37));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = (uv - 0.5) * aspect;
  float t = u_time * 0.1;

  // Bend space with two slow noise fields so the colour regions fold and stretch.
  vec2 n = p * u_scale + seedOffset(u_seed);
  vec2 warp = vec2(
    noise(n + vec2(t, -t * 0.7)),
    noise(n + vec2(5.2 - t * 0.6, 1.3 + t))
  ) - 0.5;
  vec2 q = p + warp * 0.85 * u_intensity;

  // The pointer gently pushes the field away from itself.
  vec2 toPointer = (uv - u_pointer) * aspect;
  q += toPointer * 0.3 * exp(-dot(toPointer, toPointer) * 5.0);

  // Each colour pulls on a pixel by its distance to that colour's anchor.
  float phase = u_seed * 1.7;
  vec2 d1 = q - anchor(t, phase, vec2(1.3, 1.1), aspect);
  vec2 d2 = q - anchor(t, phase + 2.1, vec2(0.9, 1.4), aspect);
  vec2 d3 = q - anchor(t, phase + 4.2, vec2(1.1, 0.8), aspect);
  vec2 d4 = q - anchor(t, phase + 5.5, vec2(0.7, 1.2), aspect);
  float w1 = exp(-dot(d1, d1) * 3.2);
  float w2 = exp(-dot(d2, d2) * 3.2);
  float w3 = exp(-dot(d3, d3) * 3.2);
  float w4 = exp(-dot(d4, d4) * 3.2);
  vec3 color = (u_color1 * w1 + u_color2 * w2 + u_color3 * w3 + u_color4 * w4)
    / (w1 + w2 + w3 + w4 + 1e-4);

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
