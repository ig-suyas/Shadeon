import { FBM, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;

${HASH}
${NOISE}
${FBM}
${SEED}
// 2x2 ordered-dither matrix: 0, 2 / 3, 1.
float bayer2(vec2 c) {
  return mod(2.0 * c.x + 3.0 * c.y, 4.0);
}

// 8x8 ordered-dither threshold in 0..1, built by nesting the 2x2 matrix three times.
float bayer8(vec2 cell) {
  vec2 c = mod(cell, 8.0);
  float fine = bayer2(mod(c, 2.0));
  float mid = bayer2(mod(floor(c / 2.0), 2.0));
  float coarse = bayer2(floor(c / 4.0));
  return (16.0 * fine + 4.0 * mid + coarse + 0.5) / 64.0;
}

void main() {
  // Work on a coarse pixel grid; u_scale is the size of one dither pixel.
  vec2 cell = floor(gl_FragCoord.xy / u_scale);
  vec2 uv = (cell + 0.5) * u_scale / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * 0.07;

  // A slow tonal field with a gentle top-to-bottom lean.
  float tone = fbm(p * 1.3 + seedOffset(u_seed) + vec2(t, -t * 0.6));
  tone = mix(tone, uv.y, 0.4);
  tone = clamp((tone - 0.5) * u_intensity * 1.6 + 0.5, 0.0, 1.0);

  // Three colours, with the two transitions rendered as dither patterns.
  float level = tone * 2.0;
  float lower = floor(level);
  float index = min(2.0, lower + step(bayer8(cell), level - lower));
  vec3 color = index < 0.5 ? u_color1 : (index < 1.5 ? u_color2 : u_color3);

  gl_FragColor = vec4(color, 1.0);
}
`;
