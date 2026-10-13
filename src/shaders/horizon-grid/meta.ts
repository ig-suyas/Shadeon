import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "horizon-grid",
  name: "Horizon Grid",
  description:
    "A glowing grid running to a hazy horizon. It glides forward on its own and travels further as the page scrolls.",
  category: "lines",
  tags: ["grid", "perspective", "retro", "synthwave", "scroll", "horizon"],
  colors: {
    default: ["#07060f", "#ff4fa3", "#7df9ff"],
    labels: ["Sky and ground", "Horizon glow", "Grid lines"],
  },
  controls: [
    speed(),
    scale({ label: "Grid density", default: 1, min: 0.4, max: 2.5 }),
    intensity({ label: "Line brightness", default: 0.9, min: 0, max: 1 }),
    seed(0),
    slider("horizon", "Horizon height", {
      default: 0.55,
      min: 0.2,
      max: 0.9,
      step: 0.01,
      description: "Where the horizon sits, from bottom (0) to top (1).",
    }),
  ],
  presets: [
    { id: "neon", name: "Neon", colors: ["#07060f", "#ff4fa3", "#7df9ff"] },
    {
      id: "sunset",
      name: "Sunset",
      colors: ["#12071a", "#ff8a3d", "#ffd27a"],
      values: { horizon: 0.5 },
    },
    {
      id: "blueprint",
      name: "Blueprint",
      colors: ["#071a33", "#2f6fdb", "#dbe9ff"],
      values: { horizon: 0.7, intensity: 0.7 },
    },
    {
      id: "mono",
      name: "Mono",
      colors: ["#0a0a0b", "#55585f", "#e6e7ea"],
      values: { scale: 1.4, intensity: 0.6 },
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
    "Written from scratch for Shadeon: analytic perspective plane with footprint-based line anti-aliasing and exponential fog.",
};
