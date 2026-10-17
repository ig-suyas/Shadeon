import { DITHER, FBM, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

/**
 * Black Hole. A non-rotating black hole seen from just above its accretion
 * disk, ray traced: every pixel's ray is bent by gravity (the photon orbit
 * equation of a Schwarzschild hole, integrated in Cartesian form) and picks
 * up light each time it crosses the thin disk. That one rule draws the bright
 * band in front of the hole, the far side of the disk lifted over the top and
 * tucked under the bottom, and the photon ring at the edge of the shadow.
 *
 * The disk is fibrous gas: fine noise stretched along the orbit, lanes and
 * gaps in radius, uneven clumps, all turning with differential rotation
 * (inner gas faster). Doppler beaming brightens and whitens the side moving
 * toward the viewer. Light grazing the photon sphere glows softly and bleeds
 * into the shadow. A hue-preserving filmic curve keeps detail in the core.
 */
export const fragment = /* glsl */ `${HEADER}uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_tilt;
uniform float u_x;
uniform float u_y;

${HASH}
${NOISE}
${FBM}
${SEED}
${DITHER}
// Units: the Schwarzschild radius is 1 (horizon r = 1, photon sphere 1.5,
// shadow radius 2.6, innermost stable orbit 3).
const float R_IN = 3.0;
const float R_OUT = 16.0;
const float CAM_DIST = 26.0;
const float B_CRIT = 2.598;

// Colour of gas by heat: deep brown, orange, peach, cream.
vec3 ramp(float h) {
  vec3 c = mix(u_color2 * 0.3, u_color2, smoothstep(0.0, 0.22, h));
  c = mix(c, u_color3, smoothstep(0.18, 0.55, h));
  return mix(c, u_color4, smoothstep(0.5, 1.05, h));
}

// Light given off where a ray crosses the disk, and how opaque the gas is.
// order counts earlier crossings: images that wrapped around the hole are dimmer.
vec4 disk(vec3 hit, vec3 dir, vec2 offset, float order) {
  float r = length(hit.xz);
  if (r < R_IN || r > R_OUT) return vec4(0.0);
  // differential rotation: inner gas turns faster, all of it slowly
  float phi = atan(hit.z, hit.x) - u_time * 0.32 * pow(R_IN / r, 1.5);
  vec2 ring = vec2(cos(phi), sin(phi));
  // turbulence bends the orbits, so lanes wander instead of forming circles
  float rw = r + (fbm(ring * 2.1 + vec2(r * 0.45, 0.0) + offset) - 0.5) * 0.9;
  // lanes: bright and dark bands in radius, with gaps
  float lanes = smoothstep(0.28, 0.78, fbm(vec2(rw * 2.4, ring.x * 0.8 + ring.y * 0.6) + offset * 1.3));
  // fibres: very fine in radius, long along the orbit
  float rf = rw + (noise(ring * 6.0 + vec2(rw * 2.0, 0.0) - offset) - 0.5) * 0.35;
  float f1 = noise(vec2(rf * 24.0, ring.x * 3.2) + offset);
  float f2 = noise(vec2(rf * 24.0 + 9.1, ring.y * 3.2) - offset);
  float fibre = mix(f1, f2, ring.y * ring.y);
  float grain = noise(vec2(rw * 58.0, ring.x * 3.3 + ring.y * 2.1) + offset * 3.0);
  // uneven clumps riding the flow
  float clump = fbm(ring * 4.2 + vec2(rw * 0.9, -rw * 0.5) + offset * 1.7);
  float dens = (0.18 + 1.0 * lanes) * (0.5 + 0.85 * clump) * (0.55 + 0.6 * fibre + 0.3 * grain);

  // Doppler beaming: gas moving toward the eye is brighter and hotter
  vec3 tang = normalize(vec3(-hit.z, 0.0, hit.x));
  float beta = min(sqrt(0.5 / r), 0.55);
  float gamma = inversesqrt(1.0 - beta * beta);
  float dop = 1.0 / (gamma * (1.0 - beta * dot(tang, -dir)));
  float beam = mix(1.0, dop * dop * dop, 0.75);

  float heat = pow(R_IN / r, 1.6);
  float edges = smoothstep(R_IN, R_IN + 0.5, r) * (1.0 - smoothstep(R_OUT * 0.35, R_OUT, r));
  float fade = order < 0.5 ? 1.0 : (order < 1.5 ? 0.8 : 0.3);
  float light = heat * dens * beam * edges * fade;
  vec3 col = ramp(clamp(pow(heat, 0.55) * dop * (0.7 + 0.4 * dens), 0.0, 1.2));
  float alpha = clamp(light * 1.5, 0.0, 0.9) * edges;
  return vec4(col * light * 2.6, alpha);
}

void main() {
  vec2 res = u_resolution;
  vec2 p = (gl_FragCoord.xy - 0.5 * res) / res.y;
  // where the hole sits on screen (x, y are offsets from the frame centre)
  vec2 hole = vec2(u_x * res.x / res.y, u_y);
  vec2 q = p - hole;
  // the disk runs diagonally across the frame, rising to the right
  float roll = -0.32;
  q = mat2(cos(roll), sin(roll), -sin(roll), cos(roll)) * q;
  // screen to impact parameter: the shadow (radius 2.6) spans 0.37 of the height
  float lens = 7.0 / u_scale;

  float el = radians(u_tilt);
  vec3 cam = CAM_DIST * vec3(0.0, sin(el), cos(el));
  vec3 fwd = -normalize(cam);
  vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, fwd);
  vec3 dir = normalize(fwd + (q.x * right + q.y * up) * lens / CAM_DIST);

  vec3 x = cam;
  vec3 v = dir;
  vec3 hv = cross(x, v);
  float h2 = dot(hv, hv);
  float b = sqrt(h2);
  vec2 offset = seedOffset(u_seed);

  vec3 col = vec3(0.0);
  float alpha = 0.0;
  float order = 0.0;
  // closest approach to the hot inner ring of gas, for the bloom
  float haze = 1e3;

  // Out here gravity barely bends the ray: jump straight to the sphere that
  // holds the disk. Rays that miss it see only empty space.
  float reach = R_OUT + 2.0;
  float bq = dot(x, v);
  float disc = bq * bq - (dot(x, x) - reach * reach);
  if (disc > 0.0) {
    x += v * max(-bq - sqrt(disc), 0.0);
    for (int i = 0; i < 240; i++) {
      float r = length(x);
      // short steps only near the photon sphere, where paths curl
      float dt = clamp(r * mix(0.07, 0.16, smoothstep(2.0, 5.0, r)), 0.02, 2.0);
      float r2 = r * r;
      vec3 acc = -1.5 * h2 * x / (r2 * r2 * r);
      vec3 nv = v + acc * dt;
      vec3 nx = x + nv * dt;
      // a soft glow of hot gas just above and below the disk
      if (abs(nx.y) < 2.5) {
        float rr = length(nx.xz);
        float k = R_IN / max(rr, R_IN);
        float near = exp(-abs(nx.y) * 1.8) * smoothstep(R_OUT, R_IN, rr) * smoothstep(R_IN * 0.7, R_IN * 1.5, rr);
        col += (1.0 - alpha) * u_color3 * near * k * sqrt(k) * 0.045 * dt;
      }
      // crossing the disk plane: add what the disk shows there
      if (x.y * nx.y < 0.0) {
        vec3 hit = mix(x, nx, x.y / (x.y - nx.y));
        vec4 d = disk(hit, normalize(nv), offset, order);
        col += (1.0 - alpha) * d.rgb;
        alpha += (1.0 - alpha) * d.a;
        order += 1.0;
      }
      haze = min(haze, length(vec2(length(nx.xz) - R_IN * 1.5, nx.y * 1.6)));
      x = nx;
      v = nv;
      if (r < 1.02 || alpha > 0.995) break;
      if (r > reach && dot(x, v) > 0.0) break;
    }
  }

  // The photon ring: light that skimmed the photon sphere. Soft, a little
  // uneven, brighter on the side whose gas moves toward the eye, and bleeding
  // into the shadow instead of stopping at a hard edge.
  float dr = b - B_CRIT;
  float around = atan(q.y, q.x);
  float uneven = 0.55 + 0.9 * noise(vec2(around * 4.0, 1.7) + offset) * noise(vec2(around * 9.0, 4.1) - offset);
  // the approaching gas is on the right of the hole
  float side = 0.3 + 0.7 * clamp(q.x / max(length(q), 1e-3) * 0.8 + 0.45, 0.0, 1.0);
  float ring = exp(-abs(dr) * 12.0) * 0.22 + exp(-max(dr, 0.0) * 2.4) * 0.05 * step(0.0, dr);
  float bleed = exp(min(dr, 0.0) * 2.4) * step(dr, 0.0);
  col += (1.0 - alpha * 0.7) * u_color4 * (ring * uneven * side + bleed * 0.05);

  // Bloom: light scattered off the hot inner gas fills the space around it,
  // so the band, the arc over the top and the one underneath glow.
  // Rays that fall into the hole keep only a trace of it, so the shadow stays dark.
  float inShadow = smoothstep(0.0, -0.35, dr);
  col += u_color3 * (exp(-haze * 0.9) * 0.11 + exp(-haze * 0.3) * 0.022) * (1.0 - alpha * 0.5) * (1.0 - 0.85 * inShadow);

  // A hue-preserving filmic curve: the core stays cream with detail, the gas
  // keeps its colour, and the brightest light drifts toward the core colour.
  col *= u_intensity * 4.5;
  float peak = max(max(col.r, col.g), max(col.b, 1e-4));
  vec3 mapped = col * ((1.0 - exp(-peak * 1.25)) / peak);
  mapped = mix(mapped, u_color4 * (1.0 - exp(-peak * 1.25)), smoothstep(0.5, 3.5, peak) * 0.65);
  mapped += u_color1;
  gl_FragColor = vec4(dither(clamp(mapped, 0.0, 1.0)), 1.0);
}
`;
