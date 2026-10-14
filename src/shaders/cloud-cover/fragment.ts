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
// How much cloud there is at a point.
float density(vec2 p, float t) {
  vec2 drift = vec2(t * 0.3, 0.0);
  vec2 bend = vec2(fbm(p * 0.5 + drift), fbm(p * 0.5 - drift + 4.7)) - 0.5;
  return fbm(p + bend * 1.2);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  // Clouds are wider than they are tall, so the field is stretched sideways.
  vec2 p = vec2((uv.x - 0.5) * u_resolution.x / u_resolution.y * 0.6, uv.y) * u_scale * 2.2;
  float t = u_time * 0.1;
  p += seedOffset(u_seed) + vec2(t * 0.5, 0.0);

  float here = density(p, t);
  // Density a little higher up: if there is less cloud above, this is a sunlit top.
  float above = density(p + vec2(0.0, 0.3), t);

  float threshold = 0.66 - 0.2 * u_intensity;
  float cover = smoothstep(threshold, threshold + 0.3, here);
  float lit = smoothstep(-0.18, 0.18, here - above) * 0.7 + cover * 0.3;

  vec3 sky = mix(u_color1, u_color2, smoothstep(0.0, 1.0, uv.y));
  vec3 cloud = mix(u_color4, u_color3, lit);
  vec3 color = mix(sky, cloud, cover);

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
