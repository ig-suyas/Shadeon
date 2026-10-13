import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "paper-pleats",
  name: "Paper Pleats",
  description:
    "A sheet of softly lit pleats, each with a bright face, a shaded face and a fine highlight on the fold, breathing slowly.",
  category: "lines",
  tags: ["pleats", "folds", "paper", "minimal", "stripes", "calm"],
  colors: {
    default: ["#e9e4da", "#cfc6b6", "#ffffff"],
    labels: ["Paper A", "Paper B", "Fold highlight"],
  },
  controls: [
    speed(),
    scale({
      label: "Pleats",
      default: 1,
      min: 0.3,
      max: 3,
      description: "Higher shows more, narrower pleats.",
    }),
    intensity({ label: "Waviness", default: 1, min: 0, max: 2.5 }),
    seed(11),
    slider("angle", "Angle", {
      default: 28,
      min: 0,
      max: 180,
      step: 1,
      description: "Direction of the pleats in degrees.",
    }),
  ],
  presets: [
    { id: "linen", name: "Linen", colors: ["#e9e4da", "#cfc6b6", "#ffffff"] },
    {
      id: "slate",
      name: "Slate",
      colors: ["#2b3240", "#3d4759", "#aab6cc"],
      values: { angle: 62 },
    },
    {
      id: "clay",
      name: "Clay",
      colors: ["#c8553d", "#f28f3b", "#ffd5c2"],
      values: { scale: 0.7, angle: 12 },
    },
    {
      id: "sage",
      name: "Sage",
      colors: ["#a3b18a", "#588157", "#e9f5db"],
      values: { scale: 1.4, intensity: 1.5, angle: 90 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 1,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 3,
  provenance:
    "Written from scratch for Shadeon: a sawtooth shading profile along a rotated axis with noise-wandering edges.",
};
