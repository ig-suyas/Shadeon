import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "liquid-chrome",
  name: "Liquid Chrome",
  description:
    "A slow, polished liquid surface that mirrors a soft studio: graded backdrop, long strip lights and a tinted rim.",
  category: "liquid",
  tags: ["liquid", "metal", "chrome", "reflective", "premium", "hero"],
  colors: {
    default: ["#07080c", "#3d4756", "#e6ebf2", "#6f8fc9"],
    labels: ["Reflection, low", "Reflection, high", "Strip lights", "Rim tint"],
  },
  controls: [
    speed(),
    scale({ default: 1, min: 0.4, max: 2.5, description: "Zoom. Higher shows more, finer folds." }),
    intensity({ label: "Flow", default: 1, min: 0, max: 2 }),
    seed(23),
    slider("relief", "Relief", {
      default: 1,
      min: 0.3,
      max: 2.5,
      description: "How deep the folds look.",
    }),
  ],
  presets: [
    { id: "chrome", name: "Chrome", colors: ["#07080c", "#3d4756", "#e6ebf2", "#6f8fc9"] },
    {
      id: "gold",
      name: "Gold",
      colors: ["#120a02", "#7a4b12", "#ffe3a1", "#d98a2b"],
      values: { relief: 1.2 },
    },
    {
      id: "oil",
      name: "Oil",
      colors: ["#05030a", "#2b1a5e", "#7ff0d6", "#c04bd6"],
      values: { intensity: 1.3, relief: 0.8 },
    },
    {
      id: "pearl",
      name: "Pearl",
      colors: ["#c9ccd6", "#eceef4", "#ffffff", "#f3c6d8"],
      values: { relief: 0.7, speed: 0.7 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 2,
  tier: "pro",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  featured: true,
  stillTime: 8,
  provenance:
    "Written from scratch for Shadeon: warped noise height field shaded by a procedural studio reflection.",
};
