import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "ink-bloom",
  name: "Ink Bloom",
  description:
    "Your cursor pours ink into still water. It follows your movement, swirls on a slow current and marbles as it spreads, pooling darker at the edges.",
  category: "fluid",
  tags: ["ink", "fluid", "pointer", "marble", "trail", "interactive", "light"],
  colors: {
    default: ["#f2efe9", "#1d2a6b", "#c2412d", "#0f6b62"],
    labels: ["Paper", "Ink one", "Ink two", "Ink three"],
  },
  controls: [
    speed(1),
    scale({
      label: "Current size",
      default: 1,
      min: 0.4,
      max: 2.5,
      description: "Higher makes the swirls smaller.",
    }),
    intensity({
      label: "Brush",
      default: 1,
      min: 0.5,
      max: 2.5,
      description: "How wide the cursor pours.",
    }),
    slider("swirl", "Swirl", {
      default: 1,
      min: 0,
      max: 3,
      description: "How strongly the water turns the ink.",
    }),
    seed(14),
  ],
  presets: [
    { id: "indigo", name: "Indigo", colors: ["#f2efe9", "#1d2a6b", "#c2412d", "#0f6b62"] },
    {
      id: "sumi",
      name: "Sumi",
      colors: ["#f4f1ea", "#141414", "#3a3a3a", "#8a1f1f"],
      values: { swirl: 0.7 },
    },
    {
      id: "deep-water",
      name: "Deep Water",
      colors: ["#06080d", "#4f7cff", "#ff5fa2", "#46e0c2"],
      values: { swirl: 1.4 },
    },
    {
      id: "saffron",
      name: "Saffron",
      colors: ["#0d0907", "#ff9a3c", "#ffd36b", "#d6452b"],
      values: { scale: 1.4 },
    },
  ],
  reactive: { pointer: true, scroll: false },
  cost: 2,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 9,
  provenance:
    "Written from scratch for Shadeon: semi-Lagrangian advection of ink in frame memory along a two-octave curl-noise current plus the pointer's velocity, with pooled-pigment edges from the amount gradient.",
};
