import { intensity, scale, seed, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "lava-blobs",
  name: "Lava Blobs",
  description:
    "Six soft blobs rise, sink and merge like wax in a lava lamp. One more follows the pointer and the others stretch towards it.",
  category: "interactive",
  tags: ["metaballs", "blobs", "lava", "pointer", "playful", "soft"],
  colors: {
    default: ["#1a0b2e", "#ff6b35", "#ffd166", "#7b2cbf"],
    labels: ["Background", "Blob edge", "Blob core", "Halo"],
  },
  controls: [
    speed(),
    scale({
      label: "Blob size",
      default: 1,
      min: 0.6,
      max: 2,
      description: "Higher makes the blobs smaller.",
    }),
    intensity({ label: "Halo", default: 1, min: 0, max: 2 }),
    seed(44),
  ],
  presets: [
    { id: "lamp", name: "Lamp", colors: ["#1a0b2e", "#ff6b35", "#ffd166", "#7b2cbf"] },
    {
      id: "mint",
      name: "Mint",
      colors: ["#0b1f1c", "#2ec4b6", "#cbf3f0", "#126b63"],
      values: { scale: 0.9 },
    },
    {
      id: "bubblegum",
      name: "Bubblegum",
      colors: ["#fde2f3", "#ff70a6", "#ffd6e8", "#ffb3d1"],
      values: { intensity: 0.6 },
    },
    {
      id: "mercury",
      name: "Mercury",
      colors: ["#0a0b0d", "#8d99ae", "#f4f6fa", "#3a4252"],
      values: { scale: 1.2, speed: 0.7 },
    },
  ],
  reactive: { pointer: true, scroll: false },
  cost: 1,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 6,
  provenance:
    "Written from scratch for Shadeon: metaballs (summed inverse-square fields with a threshold), shaded by field strength.",
};
