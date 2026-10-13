import { intensity, scale, seed, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "caustic-light",
  name: "Caustic Light",
  description:
    "Nets of sunlight shifting across the floor of a pool, the pattern moving water focuses onto whatever lies beneath it.",
  category: "liquid",
  tags: ["water", "caustics", "pool", "light", "summer", "calm"],
  colors: {
    default: ["#0a4d68", "#088395", "#e8fbff"],
    labels: ["Deep water", "Shallow water", "Light"],
  },
  controls: [
    speed(),
    scale({ default: 1, min: 0.4, max: 2.5, description: "Zoom. Higher shows a finer net." }),
    intensity({ label: "Light", default: 1, min: 0, max: 2.5 }),
    seed(58),
  ],
  presets: [
    { id: "pool", name: "Pool", colors: ["#0a4d68", "#088395", "#e8fbff"] },
    {
      id: "lagoon",
      name: "Lagoon",
      colors: ["#0b6e6e", "#3ec1b0", "#fffbe0"],
      values: { intensity: 0.8 },
    },
    {
      id: "midnight",
      name: "Midnight",
      colors: ["#03070f", "#0b1f3a", "#8fb8ff"],
      values: { intensity: 1.3, speed: 0.7 },
    },
    {
      id: "sand",
      name: "Sand",
      colors: ["#c9a76a", "#e8d3a2", "#fffdf2"],
      values: { scale: 1.3, intensity: 0.7 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 2,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 5,
  provenance:
    "Written from scratch for Shadeon: products of ridged value noise through a noise warp, two scales.",
};
