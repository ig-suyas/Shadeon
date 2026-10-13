import { HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_ribs;

${HASH}
${NOISE}
${SEED}
// A colour anchor that wanders on a slow looping path.
vec2 anchor(float t, float phase, vec2 rate, vec2 aspect) {
  return 0.42 * aspect * vec2(sin(t * rate.x + phase), cos(t * rate.y + phase * 1.37));
}

// The soft scene behind the glass: four colours pulling on each point by distance.
vec3 backdrop(vec2 uv, float t) {
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = (uv - 0.5) * aspect;
  vec2 n = p * u_scale + seedOffset(u_seed);
  vec2 warp = vec2(
    noise(n + vec2(t, -t * 0.7)),
    noise(n + vec2(5.2 - t * 0.6, 1.3 + t))
  ) - 0.5;
  vec2 q = p + warp * 0.85;
  float phase = u_seed * 1.7;
  vec2 d1 = q - anchor(t, phase, vec2(1.3, 1.1), aspect);
  vec2 d2 = q - anchor(t, phase + 2.1, vec2(0.9, 1.4), aspect);
  vec2 d3 = q - anchor(t, phase + 4.2, vec2(1.1, 0.8), aspect);
  vec2 d4 = q - anchor(t, phase + 5.5, vec2(0.7, 1.2), aspect);
  float w1 = exp(-dot(d1, d1) * 4.6);
  float w2 = exp(-dot(d2, d2) * 4.6);
  float w3 = exp(-dot(d3, d3) * 4.6);
  float w4 = exp(-dot(d4, d4) * 4.6);
  return (u_color1 * w1 + u_color2 * w2 + u_color3 * w3 + u_color4 * w4)
    / (w1 + w2 + w3 + w4 + 1e-4);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.1;

  // Each vertical rib is a small lens: it shifts what is seen through it
  // in proportion to how far across the rib the pixel sits.
  float across = fract(uv.x * u_ribs) - 0.5;
  vec2 seen = uv;
  seen.x -= across * u_intensity * 0.3;
  vec3 color = backdrop(seen, t);

  // Grooves between ribs are darker; each rib catches a narrow highlight.
  float groove = smoothstep(0.36, 0.5, abs(across));
  float glint = exp(-pow((across + 0.24) * 10.0, 2.0));
  color *= 1.0 - 0.13 * groove;
  color += (1.0 - color) * glint * 0.14;

  // A touch of grain, as sandblasted glass has.
  color += (hash21(gl_FragCoord.xy) - 0.5) * 0.025;

  gl_FragColor = vec4(color, 1.0);
}
`;
