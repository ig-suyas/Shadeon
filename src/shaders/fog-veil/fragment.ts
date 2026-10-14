import { DITHER, FBM, HASH, HEADER, NOISE, SEED } from "../glsl/chunks";

/**
 * Fog Veil. A thick, slowly rolling fog lit from above; the pointer wipes a
 * path through it that reveals a glowing light underneath. The path's edges
 * glow where light scatters through the thinning fog, and the fog curls back
 * in over a few seconds. When the pointer is idle (and on gallery cards) a
 * slow phantom wisp keeps clearing, so it is never static.
 *
 * Frame memory: pass 0 keeps how cleared each point is (red channel), drifts
 * it along a slow flow and lets it refill; pass 1 draws fog and light.
 */
export const fragment = /* glsl */ `${HEADER}uniform vec2 u_pointer;
uniform vec2 u_velocity;
uniform float u_activity;
uniform float u_delta;
uniform sampler2D u_prev;
uniform float u_pass;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;
uniform float u_scale;
uniform float u_intensity;
uniform float u_seed;
uniform float u_refill;

${HASH}
${NOISE}
${FBM}
${SEED}
${DITHER}
float segment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  return length(p - a - ab * h);
}

// The phantom wisp that wanders when nobody is steering.
vec2 wisp(float t) {
  return vec2(0.5 + 0.34 * sin(t * 0.21 + u_seed * 0.37), 0.5 + 0.24 * sin(t * 0.33 + 1.7));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = uv * aspect;
  float t = u_time;
  vec2 offset = seedOffset(u_seed);

  if (u_pass < 0.5) {
    // Cleared paths drift and curl on a slow flow, like smoke in still air.
    vec2 q = p * 2.6 + offset;
    vec2 flow = vec2(noise(q + t * 0.12), noise(q + 17.3 - t * 0.1)) - 0.5;
    vec2 source = uv - flow * 0.006 * (u_delta * 60.0) / aspect;
    // A little diffusion every frame, so a cleared path frays into vapour.
    vec2 px = 1.25 / u_resolution;
    float clear = texture2D(u_prev, source).r * 0.6
      + 0.1 * (texture2D(u_prev, source + vec2(px.x, 0.0)).r + texture2D(u_prev, source - vec2(px.x, 0.0)).r
        + texture2D(u_prev, source + vec2(0.0, px.y)).r + texture2D(u_prev, source - vec2(0.0, px.y)).r);
    // The fog rolls back in, unevenly.
    float refill = u_delta * 0.2 * u_refill * (0.55 + 0.9 * noise(q * 1.7 + t * 0.25));
    clear = max(clear - refill, 0.0);

    // The brush: a soft capsule along the path the pointer took this frame,
    // wider when it moves fast.
    vec2 b = u_pointer * aspect;
    vec2 a = (u_pointer - u_velocity * u_delta * 2.0) * aspect;
    float speed = length(u_velocity * aspect);
    float radius = 0.13 * u_intensity * (0.75 + min(speed, 2.5) * 0.3);
    float brush = 1.0 - smoothstep(radius * 0.2, radius, segment(p, a, b));
    brush *= clamp(u_activity * 1.6, 0.0, 1.0);

    // The phantom wisp, when the pointer rests.
    float idle = 1.0 - clamp(u_activity * 2.0, 0.0, 1.0);
    vec2 w = wisp(t) * aspect;
    vec2 wPrev = wisp(t - 0.6) * aspect;
    float ghost = smoothstep(0.14 * u_intensity, 0.02, segment(p, wPrev, w)) * idle * 0.55;

    // The pointer clears at once; the wisp only thins the fog.
    clear = max(clear, brush * 0.95);
    clear = clamp(clear + ghost * u_delta * 3.0, 0.0, max(clear, 0.62));
    gl_FragColor = vec4(clear, 0.0, 0.0, 1.0);
    return;
  }

  // Soften the cleared field a little so its edge reads as vapour.
  vec2 px = 1.5 / u_resolution;
  float clear = texture2D(u_prev, uv).r * 0.4
    + 0.15 * (texture2D(u_prev, uv + vec2(px.x, 0.0)).r + texture2D(u_prev, uv - vec2(px.x, 0.0)).r
      + texture2D(u_prev, uv + vec2(0.0, px.y)).r + texture2D(u_prev, uv - vec2(0.0, px.y)).r);

  // The light underneath: a broad warm source, unevenly lit by slow swells.
  vec2 c = (uv - vec2(0.5, 0.42)) * aspect;
  float glow = exp(-dot(c, c) * 1.3);
  float swell = fbm(c * 1.6 + offset + vec2(t * 0.04, -t * 0.03));
  vec3 under = mix(u_color3, u_color4, clamp(glow * (0.6 + 0.6 * swell), 0.0, 1.0));
  under = mix(under, u_color3 * 0.6, (1.0 - glow) * 0.5);

  // The fog: warped layered noise, lit from above (thinner above = brighter).
  vec2 q = p * u_scale * 1.5 + offset;
  vec2 warp = vec2(fbm(q + vec2(t * 0.035, 0.0)), fbm(q + vec2(5.2, -t * 0.03)));
  vec2 r = q + warp * 1.7 + vec2(t * 0.045, t * 0.015);
  float dense = fbm(r);
  float fine = fbm(r * 2.3 - vec2(t * 0.06, 0.0));
  float above = fbm(r + vec2(0.0, 0.09));
  float body = smoothstep(0.15, 0.9, dense * 0.7 + fine * 0.35);
  float lit = clamp(0.55 + (dense - above) * 3.2, 0.0, 1.0);
  vec3 fogColour = mix(u_color1, u_color2, clamp(lit * 0.75 + body * 0.35, 0.0, 1.0));

  // How much fog stands in front of the light here.
  float veil = 0.5 + 0.5 * body;
  // Wisps of fog linger inside a clearing, so it reads as parting, not a cut.
  // The edge of a clearing breaks into tendrils: fine noise eats into it
  // where the fog is only half gone.
  float tendril = fbm(p * 9.0 * u_scale + warp * 2.0 - vec2(t * 0.25, t * 0.1));
  float partial = clear * (1.0 - clear) * 4.0;
  float open = smoothstep(0.12, 0.85, clear + (tendril - 0.5) * 0.9 * partial - body * 0.12);
  float cover = veil * (1.0 - open);
  vec3 col = mix(under, fogColour, cover);

  // Where the fog thins at the edge of a path, light scatters through it.
  float edge = open * (1.0 - open) * 4.0;
  col += mix(u_color2, u_color4, 0.6) * edge * (0.06 + 0.14 * body) * (0.5 + 0.7 * glow);

  // Film grain and a gentle vignette.
  col += (hash21(gl_FragCoord.xy + floor(t * 24.0) * 7.0) - 0.5) * 0.035;
  vec2 v = uv - 0.5;
  col *= 1.0 - dot(v, v) * 0.5;
  gl_FragColor = vec4(dither(clamp(col, 0.0, 1.0)), 1.0);
}
`;
