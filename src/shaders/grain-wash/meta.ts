import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "grain-wash",
  name: "Grain Wash",
  description:
    "A slow three-tone wash under animated film grain, with an optional vignette. Quiet enough to sit behind text.",
  category: "grain",
  tags: ["grain", "film", "noise", "texture", "subtle", "editorial"],
  colors: {
    default: ["#1c1a22", "#4a3f55", "#c9a27e"],
    labels: ["Shadow", "Mid tone", "Highlight"],
  },
  controls: [
    speed(),
    scale({
      label: "Grain size",
      default: 1.5,
      min: 1,
      max: 4,
      step: 0.25,
      description: "Size of one grain in pixels.",
    }),
    intensity({ label: "Grain amount", default: 0.6, min: 0, max: 1.5 }),
    seed(18),
    slider("vignette", "Vignette", {
      default: 0.35,
      min: 0,
      max: 1,
      description: "How much the corners darken.",
    }),
  ],
  presets: [
    { id: "cinema", name: "Cinema", colors: ["#1c1a22", "#4a3f55", "#c9a27e"] },
    {
      id: "newsprint",
      name: "Newsprint",
      colors: ["#d9d6cf", "#bdb9b0", "#f2f0ea"],
      values: { intensity: 0.9, vignette: 0.15, scale: 2 },
    },
    {
      id: "deep-sea",
      name: "Deep sea",
      colors: ["#03121c", "#0b3a4a", "#3fa7a3"],
      values: { intensity: 0.5, vignette: 0.6 },
    },
    {
      id: "rose",
      name: "Rose",
      colors: ["#2a1420", "#8a3b5c", "#f2b5a7"],
      values: { intensity: 0.7 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 2,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 7,
  provenance:
    "Written from scratch for Shadeon: fbm colour wash with frame-stepped hash grain and a vignette.",
};
