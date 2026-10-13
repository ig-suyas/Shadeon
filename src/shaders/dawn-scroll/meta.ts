import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "dawn-scroll",
  name: "Dawn Scroll",
  description:
    "A sky that moves from the last of the night to full morning as the page scrolls: the sun climbs, the horizon warms and haze drifts past.",
  category: "gradient",
  tags: ["sky", "sunrise", "scroll", "gradient", "calm", "hero"],
  colors: {
    default: ["#0b1026", "#ff8a5b", "#8fc4ff", "#ffe2b0"],
    labels: ["Night sky", "Horizon at dawn", "Day sky", "Sun"],
  },
  controls: [
    speed(),
    scale({ label: "Haze detail", default: 1, min: 0.4, max: 2.5 }),
    intensity({ label: "Sun glow", default: 1, min: 0, max: 2 }),
    seed(8),
    slider("offset", "Start time", {
      default: 0.35,
      min: 0,
      max: 1,
      step: 0.01,
      description: "Time of day before any scrolling: 0 is night, 1 is morning.",
    }),
  ],
  presets: [
    { id: "dawn", name: "Dawn", colors: ["#0b1026", "#ff8a5b", "#8fc4ff", "#ffe2b0"] },
    {
      id: "desert",
      name: "Desert",
      colors: ["#1a0f1f", "#e85d3a", "#f6c28b", "#fff0c9"],
      values: { offset: 0.45 },
    },
    {
      id: "arctic",
      name: "Arctic",
      colors: ["#050b1a", "#7b6cf6", "#bfe6ff", "#f4fbff"],
      values: { offset: 0.3, intensity: 0.8 },
    },
    {
      id: "noon",
      name: "Noon",
      colors: ["#0b1026", "#ff8a5b", "#6fb1ff", "#fff6d6"],
      values: { offset: 0.9 },
    },
  ],
  reactive: { pointer: false, scroll: true },
  cost: 1,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 2,
  provenance:
    "Written from scratch for Shadeon: scroll-driven sky gradient with a two-lobe sun glow and fbm haze.",
};
