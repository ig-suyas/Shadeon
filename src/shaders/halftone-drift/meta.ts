import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "halftone-drift",
  name: "Halftone Drift",
  description:
    "A printing-screen grid of dots that swell and shrink as a slow field of tone drifts underneath.",
  category: "halftone",
  tags: ["halftone", "dots", "print", "retro", "grid"],
  colors: {
    default: ["#f2ead8", "#1d3557", "#e63946"],
    labels: ["Paper", "Ink, light areas", "Ink, dense areas"],
  },
  controls: [
    speed(),
    scale({
      label: "Dots",
      default: 34,
      min: 10,
      max: 90,
      step: 1,
      description: "Number of dots across the height.",
    }),
    intensity({ label: "Dot size", default: 1, min: 0.3, max: 1.4 }),
    seed(52),
    slider("angle", "Screen angle", {
      default: 30,
      min: 0,
      max: 90,
      step: 1,
      description: "Rotation of the dot grid in degrees.",
    }),
  ],
  presets: [
    { id: "riso", name: "Riso", colors: ["#f2ead8", "#1d3557", "#e63946"] },
    {
      id: "mono",
      name: "Mono",
      colors: ["#f4f4f1", "#1a1a1a", "#1a1a1a"],
      values: { scale: 48, angle: 45 },
    },
    {
      id: "night",
      name: "Night",
      colors: ["#0b0c10", "#45a29e", "#66fcf1"],
      values: { scale: 28, intensity: 0.9, angle: 15 },
    },
    {
      id: "citrus",
      name: "Citrus",
      colors: ["#fffbe6", "#f4a261", "#2a9d8f"],
      values: { scale: 22, intensity: 1.2, angle: 60 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 1,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 4,
  provenance:
    "Written from scratch for Shadeon: rotated dot screen with per-cell fbm tone and analytic edges.",
};
