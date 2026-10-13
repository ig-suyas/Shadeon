import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "plasma-bloom",
  name: "Plasma Bloom",
  description:
    "Travelling sine waves fold into swirling bands of four looping colours. The classic plasma, smoothed and slowed.",
  category: "plasma",
  tags: ["plasma", "psychedelic", "bands", "colourful", "retro"],
  colors: {
    default: ["#12002f", "#7a04eb", "#ff2e97", "#ffc857"],
    labels: ["Colour 1", "Colour 2", "Colour 3", "Colour 4"],
  },
  controls: [
    speed(),
    scale({
      default: 1,
      min: 0.3,
      max: 3,
      description: "Zoom. Higher shows more, smaller swirls.",
    }),
    intensity({ label: "Swirl", default: 1, min: 0, max: 2.5 }),
    seed(9),
    slider("bands", "Bands", {
      default: 1,
      min: 0.3,
      max: 3,
      description: "How many times the palette repeats across the field.",
    }),
  ],
  presets: [
    { id: "arcade", name: "Arcade", colors: ["#12002f", "#7a04eb", "#ff2e97", "#ffc857"] },
    {
      id: "lagoon",
      name: "Lagoon",
      colors: ["#001219", "#0a9396", "#94d2bd", "#e9d8a6"],
      values: { bands: 0.7, intensity: 0.8 },
    },
    {
      id: "ember",
      name: "Ember",
      colors: ["#1b0000", "#9d0208", "#f48c06", "#ffe8a3"],
      values: { bands: 1.4, scale: 0.7 },
    },
    {
      id: "mint",
      name: "Mint",
      colors: ["#f1faee", "#a8dadc", "#457b9d", "#e2f6f0"],
      values: { bands: 0.6, speed: 0.6, intensity: 1.3 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 1,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 6,
  provenance:
    "Written from scratch for Shadeon: summed travelling sines with a self-warp and a looping palette.",
};
