import { DITHER, FBM, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

/**
 * Event Horizon. A black hole bends the space behind it: stars and nebula
 * are lensed into arcs around it, a thin photon ring burns at its edge, and a
 * tilted accretion disk of hot gas spins around it, brighter on the side
 * turning towards the viewer. The hole stays where it is placed (the x and y
 * controls); the pointer moves the sky behind it, near stars more than far
 * ones, so the stars slide past and bend around the hole.
 */
export const fragment = /* glsl */ `${HEADER}uniform vec2 u_pointer;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_disk;
uniform float u_x;
uniform float u_y;

${HASH}
${NOISE}
${FBM}
${SEED}
${DITHER}
mat2 turn(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

// Stars: one per cell at most, small, with a little colour and twinkle.
vec3 stars(vec2 p, float density, float t) {
  vec2 cell = floor(p);
  vec2 f = fract(p) - 0.5;
  float h = hash21(cell);
  if (h > density) return vec3(0.0);
  vec2 at = vec2(hash21(cell + 7.1), hash21(cell + 3.3)) - 0.5;
  float d = length(f - at * 0.7);
  float size = mix(0.035, 0.09, hash21(cell + 1.9));
  float glow = smoothstep(size, 0.0, d) + exp(-d * 30.0) * 0.15;
  float twinkle = 0.75 + 0.25 * sin(t * (1.0 + h * 3.0) + h * 40.0);
  vec3 tint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.86, 0.7), hash21(cell + 5.5));
  return tint * glow * twinkle;
}

// What lies behind the hole: deep space, nebula and stars. "drift" is the
// pointer's pull on the sky; nearer layers move further (parallax).
vec3 sky(vec2 p, vec2 drift, float t, vec2 offset) {
  vec2 q = p * u_scale;
  float cloud = fbm((q + drift * 0.35) * 1.3 + offset + vec2(t * 0.01, 0.0));
  float wisps = fbm((q + drift * 0.45) * 3.1 - offset + cloud * 1.5);
  vec3 col = u_color1;
  col = mix(col, u_color2, smoothstep(0.35, 0.95, cloud) * 0.85);
  col += u_color2 * smoothstep(0.55, 0.95, wisps) * 0.25;
  col += stars((q + drift) * 26.0 + offset, 0.22, t) * 0.9;
  col += stars((q + drift * 0.6) * 61.0 - offset, 0.18, t) * 0.55;
  return col;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = uv * aspect;
  float t = u_time;
  vec2 offset = seedOffset(u_seed);

  // The hole stays where it is placed; the pointer (eased by the runtime)
  // only moves the sky behind it.
  vec2 centre = vec2(0.5 + u_x, 0.5 + u_y) * aspect;
  vec2 drift = (u_pointer - 0.5) * aspect * -0.22;
  vec2 d = p - centre;
  float r = length(d);
  float rs = 0.11 * u_intensity; // horizon radius

  // Point-lens deflection: light from behind is bent around the hole, so each
  // pixel shows the sky from further out. Inside the horizon, nothing.
  float einstein = rs * 2.4;
  vec2 lensed = centre + d * (1.0 - einstein * einstein / max(r * r, 1e-5) * 0.9);
  vec3 col = sky(lensed, drift, t, offset);
  // Lensed light is concentrated near the Einstein ring.
  col *= 1.0 + 0.6 * exp(-pow((r - einstein) / (rs * 0.6), 2.0));

  // The accretion disk: a tilted ellipse of hot gas.
  float tilt = 0.2;
  float spin = 0.25;
  vec2 dd = turn(spin) * d;
  vec2 disk = vec2(dd.x, dd.y / tilt);
  float dr = length(disk);
  float inner = rs * 1.6;
  float outer = rs * (4.2 + 1.2 * u_disk);
  float band = smoothstep(inner, inner * 1.25, dr) * (1.0 - smoothstep(outer * 0.55, outer, dr));
  float angle = atan(disk.y, disk.x);
  float gas = fbm(vec2(angle * 3.0 - t * 0.9, dr * 7.0) + offset);
  float streaks = 0.9 + 0.1 * sin(angle * 24.0 + dr * 40.0 - t * 2.0 + gas * 8.0);
  // Relativistic beaming: the side moving towards us is brighter.
  float beam = 0.55 + 0.45 * cos(angle - 0.6);
  vec3 hot = mix(u_color3, u_color4, smoothstep(outer, inner, dr));
  float heat = band * (0.45 + 0.75 * gas) * streaks * beam * u_disk;
  // The far half of the disk goes behind the shadow; the near half (below,
  // after the tilt) crosses in front of it, which is what sells the depth.
  hot = mix(hot, vec3(1.0), smoothstep(inner * 1.6, inner, dr) * 0.6);
  // 0 for the far half, 1 for the near half, blended across the middle.
  float nearness = smoothstep(rs * 0.12, -rs * 0.12, dd.y);
  float farHeat = heat * (1.0 - nearness);
  col = mix(col, hot * 1.4, clamp(farHeat, 0.0, 1.0));
  col += hot * farHeat * 0.35;

  // The shadow, the photon ring, and the gas lensed over the top of the hole.
  float shadow = smoothstep(rs * 1.02, rs * 0.9, r);
  col = mix(col, vec3(0.0), shadow);
  float nearHeat = heat * nearness;
  col = mix(col, hot * 1.4, clamp(nearHeat, 0.0, 1.0));
  col += hot * nearHeat * 0.35;
  float ring = exp(-pow((r - rs * 1.06) / (rs * 0.028), 2.0));
  col += mix(u_color4, vec3(1.0), 0.3) * ring * 0.55;
  // The far side of the disk, bent by gravity into a halo over the top of
  // the shadow and, thinner, under it.
  float polar = atan(d.y, d.x);
  float haloGas = fbm(vec2(polar * 2.2 + t * 0.6, r * 12.0) + offset * 1.7);
  float up = 0.5 + 0.5 * d.y / max(r, 1e-4);
  float halo = exp(-pow((r - rs * (1.4 + 0.25 * up)) / (rs * (0.12 + 0.32 * up)), 2.0));
  col += hot * halo * (0.35 + 0.9 * haloGas) * (0.35 + 0.9 * up) * u_disk;

  // Grade: lift the blacks a touch, film grain, vignette.
  col = col / (1.0 + col * 0.35);
  col += (hash21(gl_FragCoord.xy + floor(t * 24.0) * 3.0) - 0.5) * 0.025;
  vec2 v = uv - 0.5;
  col *= 1.0 - dot(v, v) * 0.6;
  gl_FragColor = vec4(dither(clamp(col, 0.0, 1.0)), 1.0);
}
`;
