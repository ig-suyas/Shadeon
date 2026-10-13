import { intensity, scale, seed, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "dither-fade",
  name: "Dither Fade",
  description:
    "A slow tonal field reduced to three flat colours, with the transitions drawn as ordered dither patterns on a chunky pixel grid.",
  category: "halftone",
  tags: ["dither", "pixel", "retro", "bayer", "1-bit", "texture"],
  colors: {
    default: ["#14151a", "#4b5bd7", "#e9e6ff"],
    labels: ["Dark", "Middle", "Light"],
  },
  controls: [
    speed(),
    scale({
      label: "Pixel size",
      default: 3,
      min: 1,
      max: 10,
      step: 1,
      description: "Size of one dither pixel in device pixels.",
    }),
    intensity({ label: "Contrast", default: 1, min: 0.4, max: 2.5 }),
    seed(33),
  ],
  presets: [
    { id: "indigo", name: "Indigo", colors: ["#14151a", "#4b5bd7", "#e9e6ff"] },
    {
      id: "gameboy",
      name: "Handheld",
      colors: ["#0f380f", "#5a8f3c", "#cadc9f"],
      values: { scale: 4 },
    },
    {
      id: "paper",
      name: "Paper",
      colors: ["#22201c", "#8c8577", "#f1ede2"],
      values: { scale: 2, intensity: 1.2 },
    },
    {
      id: "ember",
      name: "Ember",
      colors: ["#1a0b0b", "#c8442b", "#ffd9a0"],
      values: { scale: 5 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 1,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 5,
  provenance:
    "Written from scratch for Shadeon: fbm tone quantised to three colours with an 8x8 Bayer matrix built arithmetically.",
};
