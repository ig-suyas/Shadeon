import { DITHER, HASH, HEADER, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec2 u_pointer;     // 0..1, origin bottom-left
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;

${HASH}
${SEED}
${DITHER}
// How strongly one blob is felt at p: large near its centre, fading with distance.
float pull(vec2 p, vec2 centre, float radius) {
  vec2 d = p - centre;
  return radius * radius / (dot(d, d) + 0.002);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = (uv - 0.5) * aspect;
  float t = u_time * 0.22;
  float s = seedOffset(u_seed).x;
  float size = 0.17 / u_scale;

  // Six blobs rise, sink and drift on slow looping paths. Where their pulls
  // add up past a threshold they merge into one smooth body.
  float field = 0.0;
  for (int i = 0; i < 6; i++) {
    float k = float(i);
    vec2 centre = vec2(
      sin(t * (0.5 + k * 0.11) + k * 2.4 + s) * 0.42 * aspect.x,
      cos(t * (0.37 + k * 0.07) + k * 1.7 + s * 1.3) * 0.4
    );
    field += pull(p, centre, size * (0.75 + 0.5 * fract(k * 0.618 + s)));
  }
  // The pointer is a seventh blob that the others stretch towards.
  field += pull(p, (u_pointer - 0.5) * aspect, size * 0.7);

  float body = smoothstep(1.0, 1.08, field);
  // Inside: warmer towards the core. Outside: a halo that fades with distance.
  float core = smoothstep(1.0, 3.2, field);
  vec3 inside = mix(u_color2, u_color3, core);
  float halo = smoothstep(0.25, 1.0, field);
  vec3 outside = mix(u_color1, u_color4, halo * halo * 0.55 * u_intensity);
  vec3 color = mix(outside, inside, body);

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
