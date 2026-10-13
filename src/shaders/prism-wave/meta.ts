import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "prism-wave",
  name: "Prism Wave",
  description:
    "Soft colour seen through rippled glass that splits it slightly, so thin fringes of red and blue appear where the ripples are steepest.",
  category: "glass",
  tags: ["glass", "prism", "chromatic", "refraction", "ripple", "premium"],
  colors: {
    default: ["#f5f7ff", "#9db4ff", "#ff9ec7", "#1a1c3a"],
    labels: ["Colour 1", "Colour 2", "Colour 3", "Colour 4"],
  },
  controls: [
    speed(),
    scale({
      default: 1.2,
      min: 0.5,
      max: 3,
      description: "How folded the colour behind the glass is.",
    }),
    intensity({ label: "Ripple", default: 1, min: 0, max: 2.5 }),
    seed(47),
    slider("spread", "Colour split", {
      default: 1,
      min: 0,
      max: 2,
      description: "How far apart the glass pulls red and blue.",
    }),
  ],
  presets: [
    { id: "opal", name: "Opal", colors: ["#f5f7ff", "#9db4ff", "#ff9ec7", "#1a1c3a"] },
    {
      id: "citrus",
      name: "Citrus",
      colors: ["#fff3b0", "#ff9f1c", "#2ec4b6", "#0b132b"],
      values: { spread: 1.4 },
    },
    {
      id: "noir",
      name: "Noir",
      colors: ["#0b0c10", "#2a2d3a", "#c5c9d6", "#f4f5f8"],
      values: { spread: 1.8, intensity: 1.3 },
    },
    {
      id: "coral",
      name: "Coral",
      colors: ["#ffd6c9", "#ff7b6b", "#6a4c93", "#1f1535"],
      values: { intensity: 0.8 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 2,
  tier: "pro",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 6,
  provenance:
    "Written from scratch for Shadeon: the shared soft scene sampled three times at wave-driven offsets, one per colour channel.",
};
