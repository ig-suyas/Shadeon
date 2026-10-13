import { DITHER, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_relief;

${HASH}
${NOISE}
${SEED}
${DITHER}
// Height of the liquid surface: broad swells read through a slow warp.
float surface(vec2 p, float t) {
  vec2 warp = vec2(
    noise(p * 0.7 + vec2(t, 1.7)),
    noise(p * 0.7 + vec2(5.2, -t))
  ) - 0.5;
  vec2 q = p + warp * 1.8 * u_intensity;
  return noise(q * 0.9 + vec2(-t * 0.6, t * 0.4)) * 0.8
    + noise(q * 1.9 + vec2(7.0 + t * 0.3, 3.0)) * 0.2;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) * u_scale * 1.5;
  p += seedOffset(u_seed);
  float t = u_time * 0.1;

  // Surface normal from three height samples.
  float e = 0.03;
  float h = surface(p, t);
  vec3 n = normalize(vec3(
    h - surface(p + vec2(e, 0.0), t),
    h - surface(p + vec2(0.0, e), t),
    e * 0.55 / u_relief
  ));

  // What a polished surface would mirror: a studio with a graded backdrop
  // and wide soft lights. The view looks straight down.
  vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
  float up = r.y * 0.5 + 0.5;
  vec3 color = mix(u_color1, u_color2, smoothstep(0.0, 1.0, up));
  // Two soft light bands, one broad and one narrow, sweep across the reflection.
  float broad = sin(r.x * 2.4 + r.y * 1.6 + 0.6) * 0.5 + 0.5;
  float narrow = sin(r.x * 5.1 - r.y * 3.3 + 2.4) * 0.5 + 0.5;
  color = mix(color, u_color3, smoothstep(0.35, 1.0, broad) * 0.75);
  color = mix(color, u_color3, pow(narrow, 6.0) * 0.45);
  // Darker where the surface faces the viewer, tinted where it turns away.
  float facing = n.z * n.z;
  color *= 0.72 + 0.28 * (1.0 - facing * 0.6);
  color += u_color4 * pow(1.0 - n.z, 1.5) * 0.55;

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
