import { intensity, scale, seed, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "ink-smoke",
  name: "Ink Smoke",
  description:
    "Slow billows that curl and trail like ink in water or smoke in still air, in four blended tones.",
  category: "liquid",
  tags: ["smoke", "ink", "marble", "organic", "soft", "hero"],
  colors: {
    default: ["#0b0d14", "#243b6b", "#c9d6ff", "#ff9e7a"],
    labels: ["Background", "Smoke", "Highlights", "Warm accents"],
  },
  controls: [
    speed(),
    scale({
      default: 1,
      min: 0.4,
      max: 2.5,
      description: "Zoom. Higher shows more, finer billows.",
    }),
    intensity({ label: "Curl", default: 1, min: 0, max: 1.8 }),
    seed(73),
  ],
  presets: [
    { id: "dusk", name: "Dusk", colors: ["#0b0d14", "#243b6b", "#c9d6ff", "#ff9e7a"] },
    {
      id: "marble",
      name: "Marble",
      colors: ["#f3f1ec", "#c8c5bd", "#8d8a83", "#d9b98a"],
      values: { intensity: 0.8 },
    },
    {
      id: "moss",
      name: "Moss",
      colors: ["#07110d", "#1c4a3a", "#bfe8c9", "#e8d48a"],
      values: { scale: 0.8 },
    },
    {
      id: "plum",
      name: "Plum",
      colors: ["#12060f", "#5a1e55", "#f1c5ec", "#ff8a65"],
      values: { intensity: 1.2 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 3,
  tier: "pro",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  featured: true,
  stillTime: 9,
  provenance:
    "Written from scratch for Shadeon: fbm folded through itself twice (nested domain warping), coloured by density and fold length.",
};
