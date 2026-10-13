import { intensity, scale, seed, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "conic-sweep",
  name: "Conic Sweep",
  description:
    "Four colours turning slowly around a wandering pivot, bent just enough that the sweep feels poured rather than drawn.",
  category: "gradient",
  tags: ["conic", "angular", "gradient", "soft", "hero", "colourful"],
  colors: {
    default: ["#ff7a59", "#ffd29d", "#7aa2ff", "#2b2d6e"],
    labels: ["Colour 1", "Colour 2", "Colour 3", "Colour 4"],
  },
  controls: [
    speed(),
    scale({
      label: "Twist",
      default: 1,
      min: 0,
      max: 3,
      description: "How much the sweep spirals with distance from the pivot.",
    }),
    intensity({ label: "Bend", default: 1, min: 0, max: 2 }),
    seed(21),
  ],
  presets: [
    { id: "peach", name: "Peach", colors: ["#ff7a59", "#ffd29d", "#7aa2ff", "#2b2d6e"] },
    {
      id: "mint",
      name: "Mint",
      colors: ["#d7fff1", "#77e4c8", "#3c8dad", "#16325b"],
      values: { scale: 0.6 },
    },
    {
      id: "iris",
      name: "Iris",
      colors: ["#f5d0fe", "#a78bfa", "#4338ca", "#0f1035"],
      values: { intensity: 1.4 },
    },
    {
      id: "linen",
      name: "Linen",
      colors: ["#f6f1e7", "#e8d5b7", "#c9b79c", "#f1e9dc"],
      values: { scale: 0.4, speed: 0.6 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 1,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 7,
  provenance:
    "Written from scratch for Shadeon: angular (conic) gradient around a moving pivot with a noise bend and a radial twist.",
};
