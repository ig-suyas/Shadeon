import { intensity, scale, seed, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "star-drift",
  name: "Star Drift",
  description:
    "Three depths of twinkling stars drift over a night sky with a faint cloud of dust. The layers lean with the pointer.",
  category: "particles",
  tags: ["stars", "space", "night", "particles", "parallax", "pointer"],
  colors: {
    default: ["#02030a", "#0b1030", "#ffffff", "#3a2a6b"],
    labels: ["Sky, bottom", "Sky, top", "Stars", "Dust"],
  },
  controls: [
    speed(),
    scale({
      label: "Density",
      default: 1,
      min: 0.4,
      max: 2.5,
      description: "How many stars are in view.",
    }),
    intensity({ label: "Brightness", default: 1, min: 0.2, max: 2 }),
    seed(77),
  ],
  presets: [
    { id: "midnight", name: "Midnight", colors: ["#02030a", "#0b1030", "#ffffff", "#3a2a6b"] },
    {
      id: "nebula",
      name: "Nebula",
      colors: ["#0a0214", "#2a0a3d", "#ffd6f5", "#b5179e"],
      values: { intensity: 1.2 },
    },
    {
      id: "dawn",
      name: "Dawn",
      colors: ["#f7b267", "#27325e", "#fff8e7", "#f4845f"],
      values: { scale: 0.7, intensity: 0.8 },
    },
    {
      id: "terminal",
      name: "Terminal",
      colors: ["#000000", "#03130a", "#7dffb0", "#0a3d22"],
      values: { scale: 1.6 },
    },
  ],
  reactive: { pointer: true, scroll: false },
  cost: 2,
  tier: "pro",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 3,
  provenance:
    "Written from scratch for Shadeon: three hashed star grids with twinkle, parallax and fbm dust.",
};
