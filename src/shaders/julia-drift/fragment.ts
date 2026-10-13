import { DITHER, HASH, HEADER, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;

${HASH}
${SEED}
${DITHER}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 z = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) * 2.3 / u_scale;

  // The Julia constant swings slowly along the arc of the circle where the set
  // stays connected and full of filaments, so it keeps reshaping itself
  // without ever breaking up into dust.
  float turn = 2.6 + 0.42 * sin(u_time * 0.05 + u_seed * 0.0628);
  vec2 c = 0.7885 * vec2(cos(turn), sin(turn));

  // Iterate z -> z^2 + c and remember how quickly the point escapes.
  float count = 0.0;
  float escaped = 0.0;
  float radius2 = 0.0;
  for (int i = 0; i < 56; i++) {
    if (escaped < 0.5) {
      z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
      radius2 = dot(z, z);
      if (radius2 > 64.0) {
        escaped = 1.0;
      } else {
        count += 1.0;
      }
    }
  }

  // Fractional escape count removes the hard bands between iterations.
  float smoothCount = count + 1.0 - log2(max(1.0, 0.5 * log2(max(radius2, 1.0001))));
  float v = clamp(smoothCount / 56.0, 0.0, 1.0);
  float glow = pow(v, 0.42 / u_intensity);

  // Outside: a ramp from the background through two colours as points linger longer.
  vec3 color = mix(u_color1, u_color2, smoothstep(0.0, 0.45, glow));
  color = mix(color, u_color3, smoothstep(0.35, 0.9, glow));
  // Inside the set: its own colour.
  color = mix(u_color4, color, escaped);

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
