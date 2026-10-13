import { intensity, scale, seed, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "cloud-cover",
  name: "Cloud Cover",
  description: "Soft clouds drifting across a graded sky, lit from above with shadowed undersides.",
  category: "gradient",
  tags: ["clouds", "sky", "weather", "calm", "soft", "nature"],
  colors: {
    default: ["#bfe0ff", "#4f8fd9", "#ffffff", "#9fb3cc"],
    labels: ["Sky, low", "Sky, high", "Cloud, lit", "Cloud, shaded"],
  },
  controls: [
    speed(),
    scale({
      default: 1,
      min: 0.4,
      max: 2.5,
      description: "Zoom. Higher shows more, smaller clouds.",
    }),
    intensity({ label: "Cover", default: 1, min: 0.2, max: 2 }),
    seed(39),
  ],
  presets: [
    { id: "fair", name: "Fair", colors: ["#bfe0ff", "#4f8fd9", "#ffffff", "#9fb3cc"] },
    {
      id: "sunset",
      name: "Sunset",
      colors: ["#ffb37a", "#5b4b8a", "#ffe3c2", "#b3618f"],
      values: { intensity: 1.2 },
    },
    {
      id: "storm",
      name: "Storm",
      colors: ["#6f7c8c", "#222a36", "#c3ccd6", "#3d4756"],
      values: { intensity: 1.6, scale: 0.8 },
    },
    {
      id: "night",
      name: "Night",
      colors: ["#101a33", "#050814", "#5c6f99", "#1a2440"],
      values: { intensity: 0.9, speed: 0.6 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 3,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 8,
  provenance:
    "Written from scratch for Shadeon: warped fbm density with a second sample above for top lighting.",
};
