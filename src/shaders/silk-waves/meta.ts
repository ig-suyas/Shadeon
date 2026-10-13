import { intensity, scale, seed, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "silk-waves",
  name: "Silk Waves",
  description:
    "Six overlapping ribbons roll across the frame, each with a soft sheen along its crest.",
  category: "waves",
  tags: ["waves", "layers", "ribbons", "soft", "hero"],
  colors: {
    default: ["#0d1b2a", "#1b4965", "#5fa8d3", "#cae9ff"],
    labels: ["Background", "Far ribbons", "Near ribbons", "Sheen"],
  },
  controls: [
    speed(),
    scale({
      default: 1,
      min: 0.5,
      max: 2.5,
      description: "Zoom. Higher shows more, narrower waves.",
    }),
    intensity({ label: "Wave height", default: 1, min: 0, max: 2.5 }),
    seed(5),
  ],
  presets: [
    { id: "tide", name: "Tide", colors: ["#0d1b2a", "#1b4965", "#5fa8d3", "#cae9ff"] },
    {
      id: "dune",
      name: "Dune",
      colors: ["#f6e7d0", "#e0a96d", "#b5562e", "#fff3df"],
      values: { intensity: 0.7, speed: 0.6 },
    },
    {
      id: "orchard",
      name: "Orchard",
      colors: ["#10241b", "#2d6a4f", "#95d5b2", "#f1fff5"],
      values: { scale: 1.3 },
    },
    {
      id: "dusk",
      name: "Dusk",
      colors: ["#1a1033", "#7b2d8e", "#f25c7a", "#ffd9a8"],
      values: { intensity: 1.4, scale: 0.8 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 2,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  featured: true,
  stillTime: 5,
  provenance: "Written from scratch for Shadeon: layered sine and noise crests with a crest sheen.",
};
