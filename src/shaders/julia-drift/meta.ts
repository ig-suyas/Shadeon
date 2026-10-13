import { intensity, scale, seed, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "julia-drift",
  name: "Julia Drift",
  description:
    "A Julia set whose constant swings slowly, so its filaments and spirals keep bending and re-forming. Smoothly shaded, without banding.",
  category: "fractal",
  tags: ["fractal", "julia", "math", "filaments", "detailed"],
  colors: {
    default: ["#06070d", "#3a2f8f", "#f0b8ff", "#0d0f1c"],
    labels: ["Far field", "Glow", "Filaments", "Inside the set"],
  },
  controls: [
    speed(),
    scale({ label: "Zoom", default: 1, min: 0.5, max: 4 }),
    intensity({ label: "Glow", default: 1, min: 0.4, max: 2.5 }),
    seed(20),
  ],
  presets: [
    { id: "orchid", name: "Orchid", colors: ["#06070d", "#3a2f8f", "#f0b8ff", "#0d0f1c"] },
    {
      id: "reef",
      name: "Reef",
      colors: ["#02131a", "#0b6e7a", "#b8fff0", "#031d26"],
      values: { intensity: 1.2 },
    },
    {
      id: "ember",
      name: "Ember",
      colors: ["#0d0503", "#8a2a12", "#ffd9a0", "#190906"],
      values: { scale: 1.4 },
    },
    {
      id: "ink",
      name: "Ink",
      colors: ["#f3f1ea", "#9aa0ad", "#1c1d22", "#e7e4da"],
      values: { intensity: 0.8 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 2,
  tier: "pro",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 12,
  provenance:
    "Written from scratch for Shadeon: Julia set (z squared plus c) with a slowly swinging constant and smooth escape-time shading.",
};
