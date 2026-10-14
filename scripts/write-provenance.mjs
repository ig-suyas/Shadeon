// Writes PROVENANCE.md for shaders that do not have one yet, from the notes
// below. Each shader's note is recorded when the shader is written. Existing
// files are never overwritten.
import { existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../src/shaders");

/** id -> { name, written (ISO date), techniques[], chunks } */
const NOTES = {
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
  "fog-veil": {
    name: "Fog Veil",
    written: "2026-10-14",
    techniques: [
      "Frame memory (ping-pong textures): a per-pixel clearing amount that is advected along a slow value-noise flow and refills at a noise-varied rate.",
      "Pointer brush as a soft capsule along the segment the pointer travelled this frame, widened by speed; an idle phantom brush on a Lissajous path.",
      "Fog from domain-warped fbm, lit by the density difference toward the light (a cheap self-shadow).",
      "Scattering glow where the fog is half cleared, film grain, vignette, one-LSB dither.",
    ],
    chunks: "HEADER, HASH, NOISE, FBM, SEED, DITHER",
  },
  "ink-bloom": {
    name: "Ink Bloom",
    written: "2026-10-14",
    techniques: [
      "Frame memory (ping-pong textures) holding premultiplied ink: colour times amount, and the amount.",
      "Semi-Lagrangian advection along a divergence-free current: the curl of two octaves of value noise, plus the pointer's velocity near it.",
      "Slow dissipation and a little neighbour averaging, so plumes soften as they spread.",
      "Pigment pooling: darker edges from the gradient of the ink amount; multiply over paper in light palettes, a faint glow in dark ones.",
    ],
    chunks: "HEADER, HASH, NOISE, SEED, DITHER",
  },
  "event-horizon": {
    name: "Event Horizon",
    written: "2026-10-14",
    techniques: [
      "Point-lens deflection (the thin-lens equation, simplified) of a procedural sky: fbm nebula and two layers of hashed stars.",
      "Brightening near the Einstein ring; a black shadow and a thin photon ring at the horizon.",
      "Accretion disk as a tilted, rotated ellipse band of fbm gas with ring streaks and a cosine beaming term; its tilt follows the pointer's velocity.",
      "Soft tone mapping, film grain, vignette, one-LSB dither.",
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
