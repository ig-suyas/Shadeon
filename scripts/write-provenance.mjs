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
      "Two fractal Brownian motion fields blending three tones.",
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
      "Four-stop looping palette with eased interpolation.",
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
