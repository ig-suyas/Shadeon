import { intensity, scale, seed, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "light-leak",
  name: "Light Leak",
  description:
    "Three soft washes of light drift in from the edges of a dark frame and blend like leaks on analogue film, with fine grain.",
  category: "gradient",
  tags: ["light", "film", "glow", "soft", "dark", "hero", "analog"],
  colors: {
    default: ["#0a0a0f", "#ff5a36", "#ffb347", "#7a2cff"],
    labels: ["Background", "Leak, left", "Leak, right", "Leak, below"],
  },
  controls: [
    speed(),
    scale({
      label: "Tightness",
      default: 1,
      min: 0.5,
      max: 2.5,
      description: "Higher makes each glow smaller and more defined.",
    }),
    intensity({ label: "Brightness", default: 0.9, min: 0, max: 1.6 }),
    seed(14),
  ],
  presets: [
    { id: "kodak", name: "Kodak", colors: ["#0a0a0f", "#ff5a36", "#ffb347", "#7a2cff"] },
    {
      id: "polar",
      name: "Polar",
      colors: ["#05070d", "#3fd0ff", "#8effd9", "#3c5bff"],
      values: { intensity: 0.8 },
    },
    {
      id: "rosewater",
      name: "Rosewater",
      colors: ["#120a10", "#ff7aa8", "#ffd3b8", "#b36bff"],
      values: { scale: 0.8 },
    },
    {
      id: "daylight",
      name: "Daylight",
      colors: ["#e9e6df", "#ffb38a", "#fff1c9", "#c9d8ff"],
      values: { intensity: 0.7, scale: 0.8 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 1,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  featured: true,
  stillTime: 6,
  provenance:
    "Written from scratch for Shadeon: three screen-blended Gaussian glows over a noise-bent plane, with grain.",
};
