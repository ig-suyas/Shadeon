import { DITHER, HASH, HEADER, SEED } from "../glsl/chunks";

export const fragment = /* glsl */ `${HEADER}uniform float u_scroll;     // 0..1, how far the page has scrolled
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_horizon;

${HASH}
${SEED}
${DITHER}
// Brightness of a grid line: 1 on the line, fading over its width.
// 'coord' is in cells, 'footprint' is how many cells one pixel covers there.
float gridLine(float coord, float footprint, float width) {
  float d = abs(fract(coord + 0.5) - 0.5);
  float w = width * footprint;
  // Lines much thinner than a pixel fade out instead of shimmering.
  return smoothstep(w + footprint, w, d) * smoothstep(0.3, 0.04, footprint);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  float below = u_horizon - uv.y;

  // Sky: dark above, glowing towards the horizon.
  float haze = exp(-abs(below) * 7.0);
  vec3 color = mix(u_color1, u_color2, haze * 0.55);

  if (below > 0.0) {
    // The ground is a flat plane seen in perspective: depth grows as the horizon nears.
    float depth = 1.0 / below;
    float cells = 6.0 * u_scale;
    float across = (uv.x - 0.5) * aspect * depth * cells * 0.35;
    // Travel forward with time; scrolling the page adds distance.
    float along = depth * cells * 0.35 + u_time * 0.5 + u_scroll * 12.0 + u_seed;

    // How many cells one pixel spans in each direction at this depth.
    float footAcross = depth * cells * 0.35 * aspect / u_resolution.x;
    float footAlong = depth * depth * cells * 0.35 / u_resolution.y;

    float lines = max(
      gridLine(across, footAcross, 1.2),
      gridLine(along, footAlong, 1.2)
    );
    // Distance fog swallows the far grid.
    float fog = exp(-depth * 0.13);
    vec3 ground = mix(u_color1, u_color3, lines * u_intensity * fog);
    color = mix(ground, color, haze * 0.6);
  }

  gl_FragColor = vec4(dither(color), 1.0);
}
`;
