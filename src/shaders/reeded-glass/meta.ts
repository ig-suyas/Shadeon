import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "reeded-glass",
  name: "Reeded Glass",
  description:
    "Soft colour drifting behind fluted glass. Each vertical rib bends the scene like a lens and catches a thin highlight.",
  category: "glass",
  tags: ["glass", "fluted", "refraction", "soft", "premium", "hero"],
  colors: {
    default: ["#ff6a3d", "#ffb199", "#5661f6", "#0f1433"],
    labels: ["Colour 1", "Colour 2", "Colour 3", "Colour 4"],
  },
  controls: [
    speed(),
    scale({
      default: 1.3,
      min: 0.5,
      max: 3,
      description: "How folded the colour behind the glass is.",
    }),
    intensity({ label: "Refraction", default: 1, min: 0, max: 2.5 }),
    seed(117),
    slider("ribs", "Ribs", {
      default: 26,
      min: 4,
      max: 90,
      step: 1,
      description: "Number of glass ribs across the width.",
    }),
  ],
  presets: [
    { id: "sunset", name: "Sunset", colors: ["#ff6a3d", "#ffb199", "#5661f6", "#0f1433"] },
    {
      id: "glacier",
      name: "Glacier",
      colors: ["#bfe9ff", "#f4fbff", "#4f8cff", "#0b2540"],
      values: { ribs: 40, intensity: 0.8 },
    },
    {
      id: "moss",
      name: "Moss",
      colors: ["#d9f2c4", "#7fb77e", "#1f4d3a", "#0b1a14"],
      values: { ribs: 18, intensity: 1.4 },
    },
    {
      id: "blush",
      name: "Blush",
      colors: ["#ffe4ec", "#ffb3c7", "#c88cff", "#fff6f0"],
      values: { ribs: 32, speed: 0.7 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 1,
  tier: "pro",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  featured: true,
  stillTime: 6,
  provenance:
    "Written from scratch for Shadeon: distance-weighted colour field sampled through per-rib lens offsets.",
};
