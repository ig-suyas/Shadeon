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
// Direction of the current at a point: an angle read from slow noise.
vec2 current(vec2 p, float t) {
  float angle = noise(p * 0.4 + vec2(t, -t * 0.6)) * 6.28;
  return vec2(cos(angle), sin(angle));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) * u_scale * 2.4;
  p += seedOffset(u_seed);
  float t = u_time * 0.05;

  // Walk up and down the current from this pixel and average fine noise
  // along the path. Neighbours on the same streamline share most of the
  // path, so the grain smears into strands that follow the flow.
  float sum = 0.0;
  float weight = 0.0;
  vec2 ahead = p;
  vec2 behind = p;
  for (int i = 0; i < 12; i++) {
    float w = 1.0 - float(i) / 12.0;
    sum += w * (noise(ahead * 30.0) + noise(behind * 30.0));
    weight += 2.0 * w;
    ahead += current(ahead, t) * 0.03;
    behind -= current(behind, t) * 0.03;
  }
  float strand = smoothstep(0.5 - 0.16 / u_intensity, 0.5 + 0.16 / u_intensity, sum / weight);

  // Broad, slow colour variation underneath the strands.
  float region = noise(p * 0.35 + vec2(-t * 0.8, t));
  vec3 base = mix(u_color1, u_color2, smoothstep(0.25, 0.75, region));
  vec3 color = mix(base, u_color3, strand * 0.42);

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
