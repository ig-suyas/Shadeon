// Writes PROVENANCE.md for shaders that do not have one yet, from the notes
// below. Each shader's note is recorded when the shader is written. Existing
// files are never overwritten.
import { existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../src/shaders");

/** id -> { name, written (ISO date), techniques[], chunks } */
const NOTES = {
  "silk-waves": {
    name: "Silk Waves",
    written: "2026-10-14",
    techniques: [
      "Painter's-order layering: six ribbons drawn back to front, each covering everything below its crest.",
      "Crest shape from two sine waves of different frequency plus a little value noise.",
      "Exponential falloff below the crest for the sheen.",
      "Analytic one-and-a-half pixel edge for anti-aliasing, without derivatives.",
    ],
    chunks: "HEADER, HASH, NOISE, SEED",
  },
  "grain-wash": {
    name: "Grain Wash",
    written: "2026-10-14",
    techniques: [
      "Two value-noise fields (with a little fractal Brownian motion) blending three tones.",
      "Film grain from a per-pixel hash that is re-seeded 24 times a second, weighted towards mid-tones.",
      "Radial vignette with smoothstep.",
    ],
    chunks: "HEADER, HASH, NOISE, FBM, SEED",
  },
  "halftone-drift": {
    name: "Halftone Drift",
    written: "2026-10-14",
    techniques: [
      "Amplitude-modulated halftone screen: a rotated grid with one dot per cell.",
      "Tone sampled once per cell at the dot centre, as a printing screen does.",
      "Dot radius proportional to the square root of tone, so ink coverage tracks tone.",
      "Analytic one-pixel edge for anti-aliasing, without derivatives.",
    ],
    chunks: "HEADER, HASH, NOISE, FBM, SEED",
  },
  "plasma-bloom": {
    name: "Plasma Bloom",
    written: "2026-10-14",
    techniques: [
      "Classic plasma: a sum of travelling sine waves, one of them radial around a moving point.",
      "Self-warp of the sampling position before evaluating the field.",
      "Four-stop palette walked forwards and back along a cosine, so it has no seam.",
      "One-LSB hash dither to hide banding.",
    ],
    chunks: "HEADER, HASH, SEED, DITHER",
  },
  "star-drift": {
    name: "Star Drift",
    written: "2026-10-14",
    techniques: [
      "Jittered grid: at most one star per cell, positioned and sized by a hash of the cell id.",
      "Power curve on brightness so most stars are faint and a few are bright.",
      "Three layers at different densities and drift speeds for parallax, offset by the pointer.",
      "Fractal Brownian motion for the dust cloud.",
    ],
    chunks: "HEADER, HASH, NOISE, FBM, SEED",
  },
  "liquid-chrome": {
    name: "Liquid Chrome",
    written: "2026-10-14",
    techniques: [
      "Height field from two octaves of value noise read through a noise warp.",
      "Surface normal by finite differences (three height samples).",
      "Procedural reflection: the reflected view vector indexes a graded backdrop and sine strip lights, in the manner of a studio environment map.",
      "Rim term from the normal's tilt away from the viewer.",
    ],
    chunks: "HEADER, HASH, NOISE, SEED, DITHER",
  },
  "reeded-glass": {
    name: "Reeded Glass",
    written: "2026-10-14",
    techniques: [
      "Distance-weighted colour blending between four moving anchors (the same approach as Mesh Drift) for the scene behind the glass.",
      "Fluted glass as a row of lenses: the sampling position shifts in proportion to the position across each rib.",
      "Groove darkening and a Gaussian highlight per rib.",
      "Per-pixel hash grain.",
    ],
    chunks: "HEADER, HASH, NOISE, SEED",
  },
  "flow-strands": {
    name: "Flow Strands",
    written: "2026-10-14",
    techniques: [
      "Flow field from a noise value used as an angle.",
      "Line integral convolution: fine noise averaged along the streamline in both directions with a tapering weight.",
      "Contrast curve on the result; slow value noise for the base colour.",
    ],
    chunks: "HEADER, HASH, NOISE, SEED, DITHER",
  },
  "ripple-pool": {
    name: "Ripple Pool",
    written: "2026-10-14",
    techniques: [
      "Height field as a sum of damped ring waves from the pointer and two wandering points.",
      "Surface normal by finite differences.",
      "Refraction approximated by offsetting the lookup of the pool floor along the normal.",
      "Lambert shading, a Phong-style glint and a rim term.",
    ],
    chunks: "HEADER, HASH, NOISE, SEED, DITHER",
  },
  "dawn-scroll": {
    name: "Dawn Scroll",
    written: "2026-10-14",
    techniques: [
      "Sky as a power-curve blend between a zenith and a horizon colour, both driven by a time-of-day value.",
      "Time of day from page scroll progress plus an offset control.",
      "Sun as two exponential lobes (core and glow).",
      "Fractal Brownian motion stretched horizontally for haze bands.",
    ],
    chunks: "HEADER, HASH, NOISE, FBM, SEED, DITHER",
  },
  "light-leak": {
    name: "Light Leak",
    written: "2026-10-14",
    techniques: [
      "Three elliptical Gaussian glows whose centres drift on sine paths near the frame edges.",
      "Screen blending so overlapping light rolls off instead of clipping.",
      "A small value-noise warp of the plane so the glows are not perfect ellipses.",
      "Time-stepped hash grain.",
    ],
    chunks: "HEADER, HASH, NOISE, SEED",
  },
  "dither-fade": {
    name: "Dither Fade",
    written: "2026-10-14",
    techniques: [
      "Ordered (Bayer) dithering. The 8x8 threshold matrix is built arithmetically by nesting the 2x2 matrix three times, rather than stored as a table.",
      "Tone from fractal Brownian motion with a vertical bias, sampled on a coarse pixel grid.",
      "Three-colour quantisation: each of the two transitions is dithered separately.",
    ],
    chunks: "HEADER, HASH, NOISE, FBM, SEED",
  },
  phosphor: {
    name: "Phosphor",
    written: "2026-10-14",
    techniques: [
      "Barrel distortion of screen coordinates for the curved glass.",
      "Cosine scanlines at a fixed device-pixel pitch.",
      "A three-column mask that brightens red, green and blue in turn.",
      "A Gaussian band that rolls vertically, and a quadratic vignette.",
      "Value-noise colour wash as the picture.",
    ],
    chunks: "HEADER, HASH, NOISE, SEED",
  },
  "soft-tunnel": {
    name: "Soft Tunnel",
    written: "2026-10-14",
    techniques: [
      "Polar tunnel mapping: inverse radius as depth, angle as position around the wall.",
      "Sine rings along depth and sine ribs around the angle, with the rib phase tied to depth for twist. The rib count is rounded to an integer so there is no seam.",
      "Blend to a light colour near the vanishing point and a fall-off towards the edges.",
      "One-LSB hash dither.",
    ],
    chunks: "HEADER, HASH, SEED, DITHER",
  },
  "julia-drift": {
    name: "Julia Drift",
    written: "2026-10-14",
    techniques: [
      "The Julia set of z squared plus c, a mathematical object, with c moving on a circle of radius 0.7885.",
      "Escape-time iteration (56 steps) with the standard fractional (smooth) iteration count to remove banding.",
      "A three-stop colour ramp on the smoothed count, and a separate colour for points that never escape.",
    ],
    chunks: "HEADER, HASH, SEED, DITHER",
  },
  "caustic-light": {
    name: "Caustic Light",
    written: "2026-10-14",
    techniques: [
      "Ridged value noise (bright where the noise crosses its midpoint) to draw thin wandering lines.",
      "The product of two ridged fields, raised to a power, so light concentrates where lines meet.",
      "A value-noise warp of the sampling position, and two scales of the pattern drifting in opposite directions.",
      "One-LSB hash dither.",
    ],
    chunks: "HEADER, HASH, NOISE, SEED, DITHER",
  },
  "bokeh-drift": {
    name: "Bokeh Drift",
    written: "2026-10-14",
    techniques: [
      "Jittered grid of discs with a 3x3 neighbour search so discs can overlap cell borders.",
      "Disc with a brighter rim, the shape a defocused point light makes.",
      "Three layers at different sizes and drift speeds, added together.",
      "Exponential roll-off on the sum, and a hash test that leaves some cells dark.",
    ],
    chunks: "HEADER, HASH, SEED, DITHER",
  },
  "ink-smoke": {
    name: "Ink Smoke",
    written: "2026-10-14",
    techniques: [
      "Nested domain warping: fractal Brownian motion sampled at a position displaced by fractal Brownian motion, twice.",
      "Colour from the final density and from the length of the displacement vectors.",
      "One-LSB hash dither.",
    ],
    chunks: "HEADER, HASH, NOISE, FBM, SEED, DITHER",
  },
  "horizon-grid": {
    name: "Horizon Grid",
    written: "2026-10-14",
    techniques: [
      "A ground plane in perspective computed analytically: depth is the reciprocal of the distance below the horizon.",
      "Anti-aliased grid lines without derivatives: the size of a pixel in grid cells is computed from the projection, and lines fade out when they become thinner than a pixel.",
      "Exponential distance fog and an exponential horizon glow.",
      "Forward travel from time plus page scroll progress.",
    ],
    chunks: "HEADER, HASH, SEED, DITHER",
  },
  "lava-blobs": {
    name: "Lava Blobs",
    written: "2026-10-14",
    techniques: [
      "Metaballs: each blob contributes radius squared over distance squared; the surface is where the sum crosses a threshold.",
      "Blob centres on slow sine paths; the pointer is one more blob.",
      "Shading from the field value: a core colour inside and a halo outside.",
      "One-LSB hash dither.",
    ],
    chunks: "HEADER, HASH, SEED, DITHER",
  },
  "conic-sweep": {
    name: "Conic Sweep",
    written: "2026-10-14",
    techniques: [
      "Angular (conic) gradient: colour chosen by the angle around a pivot, through a four-stop looping palette.",
      "The pivot moves on a sine path; a value-noise warp and a radius-dependent twist bend the sweep.",
      "Blend to the average colour near the pivot, where all colours would otherwise pinch together.",
      "Per-pixel hash grain.",
    ],
    chunks: "HEADER, HASH, NOISE, SEED",
  },
  "soft-bars": {
    name: "Soft Bars",
    written: "2026-10-14",
    techniques: [
      "A four-stop looping palette indexed by horizontal position.",
      "The index is offset by two sine waves and by value noise that varies with height, so bar edges sway.",
      "A sine brightness profile from bottom to top, and one-LSB hash dither.",
    ],
    chunks: "HEADER, HASH, NOISE, SEED, DITHER",
  },
  "cloud-cover": {
    name: "Cloud Cover",
    written: "2026-10-14",
    techniques: [
      "Cloud density from fractal Brownian motion warped by a second, slower fractal Brownian motion.",
      "A threshold with a soft edge for cover.",
      "Top lighting by comparing the density with a sample taken slightly higher.",
      "Vertical sky gradient and one-LSB hash dither.",
    ],
    chunks: "HEADER, HASH, NOISE, FBM, SEED, DITHER",
  },
  "paper-pleats": {
    name: "Paper Pleats",
    written: "2026-10-14",
    techniques: [
      "A repeating shading profile along a rotated axis: a lit face, a shaded face and a narrow Gaussian highlight at the fold.",
      "Value noise shifts the profile along the pleat so the folds wander.",
      "Per-pleat tint from value noise of the pleat index.",
    ],
    chunks: "HEADER, HASH, NOISE, SEED, DITHER",
  },
  "pointer-glow": {
    name: "Pointer Glow",
    written: "2026-10-14",
    techniques: [
      "Height field from rotated sine ridges bent by low-frequency value noise (domain warping); surface normal by finite differences.",
      "A point light at the pointer just above the surface: Lambert shading with inverse-square falloff.",
      "A Gaussian core for the lamp itself.",
    ],
    chunks: "HEADER, HASH, NOISE, SEED, DITHER",
  },
  "frosted-pane": {
    name: "Frosted Pane",
    written: "2026-10-14",
    techniques: [
      "The shared soft scene (distance-weighted colour anchors) as the view behind the glass.",
      "Frost as scattering: the lookup position is displaced by a fine two-channel value-noise field, and three displaced lookups are averaged into a soft blur.",
      "A Gaussian sheen band across the pane and per-pixel hash grain.",
    ],
    chunks: "HEADER, HASH, NOISE, SEED, SOFT_SCENE",
  },
  "prism-wave": {
    name: "Prism Wave",
    written: "2026-10-14",
    techniques: [
      "The shared soft scene as the view behind the glass.",
      "A horizontal displacement from two sine waves and value noise running down the pane.",
      "Chromatic dispersion approximated by sampling the scene three times with slightly different displacement, one per colour channel.",
      "Per-pixel hash grain.",
    ],
    chunks: "HEADER, HASH, NOISE, SEED, SOFT_SCENE",
  },
};

let written = 0;
for (const [id, note] of Object.entries(NOTES)) {
  const file = resolve(root, id, "PROVENANCE.md");
  if (existsSync(file)) continue;
  const text = [
    `# ${note.name} — provenance`,
    "",
    `- **Written:** ${note.written}, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.`,
    "- **Techniques used (general, published techniques, not code):**",
    ...note.techniques.map((line) => `  - ${line}`),
    `- **Shared chunks:** \`src/shaders/glsl/chunks.ts\` (${note.chunks}), all written for Shadeon.`,
    "- **License:** MIT.",
    "",
  ].join("\n");
  writeFileSync(file, text);
  written += 1;
}
console.log(`provenance: wrote ${written} file(s)`);
