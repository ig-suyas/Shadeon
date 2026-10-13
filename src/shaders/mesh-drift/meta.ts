import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "mesh-drift",
  name: "Mesh Drift",
  description:
    "A soft four-colour mesh gradient that folds slowly into itself and leans away from the pointer.",
  category: "gradient",
  tags: ["mesh", "gradient", "soft", "hero", "pointer"],
  colors: {
    default: ["#ff6b3d", "#ffc56b", "#3a2bd9", "#0b1026"],
    labels: ["Warm A", "Warm B", "Cool A", "Cool B"],
  },
  controls: [
    { key: "speed", type: "float", label: "Speed", default: 1, min: 0, max: 3, step: 0.05 },
    {
      key: "scale",
      type: "float",
      label: "Scale",
      description: "Frequency of the folds. Higher is finer.",
      default: 1.4,
      min: 0.5,
      max: 4,
      step: 0.05,
    },
    {
      key: "intensity",
      type: "float",
      label: "Warp",
      description: "How strongly the colour regions fold into each other.",
      default: 1,
      min: 0,
      max: 2,
      step: 0.05,
    },
    { key: "seed", type: "float", label: "Seed", default: 12, min: 0, max: 999, step: 1 },
  ],
  presets: [
    { id: "ember", name: "Ember", colors: ["#ff6b3d", "#ffc56b", "#3a2bd9", "#0b1026"] },
    {
      id: "lagoon",
      name: "Lagoon",
      colors: ["#7df9d0", "#1fb6c9", "#0d3b8c", "#041226"],
      values: { scale: 1.3, intensity: 1.2 },
    },
    {
      id: "paper",
      name: "Paper",
      colors: ["#f6efe4", "#f2c9b8", "#c9d6f2", "#fbf8f2"],
      values: { scale: 1.1, intensity: 0.7, speed: 0.6 },
    },
    {
      id: "orchid",
      name: "Orchid",
      colors: ["#ff8fd0", "#ffd6a8", "#6a35ff", "#140a33"],
      values: { scale: 2, intensity: 1.4 },
    },
  ],
  reactive: { pointer: true, scroll: false },
  cost: 1,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  featured: true,
  stillTime: 6,
  provenance:
    "Written from scratch for Shadeon: distance-weighted colour anchors with a noise warp.",
};
