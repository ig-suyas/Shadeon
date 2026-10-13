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
