import { intensity, scale, seed, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "ripple-pool",
  name: "Ripple Pool",
  description:
    "Still water seen from above. Rings spread from the pointer and from two wandering drops, bending the pool floor and catching the light.",
  category: "interactive",
  tags: ["water", "ripples", "pointer", "interactive", "calm"],
  colors: {
    default: ["#06283d", "#1f7a8c", "#f4fbff", "#9ad1d4"],
    labels: ["Deep water", "Shallow water", "Glints", "Rim light"],
  },
  controls: [
    speed(0.8),
    scale({
      label: "Ring spacing",
      default: 1,
      min: 0.4,
      max: 2.5,
      description: "Higher packs the rings closer together.",
    }),
    intensity({ label: "Wave height", default: 1, min: 0.2, max: 2.5 }),
    seed(12),
  ],
  presets: [
    { id: "lagoon", name: "Lagoon", colors: ["#06283d", "#1f7a8c", "#f4fbff", "#9ad1d4"] },
    {
      id: "ink",
      name: "Ink",
      colors: ["#050608", "#1a1f2b", "#e8ecf4", "#5b6b8c"],
      values: { intensity: 1.3 },
    },
    {
      id: "koi",
      name: "Koi",
      colors: ["#3b0d0c", "#d1495b", "#fff3e0", "#edae49"],
      values: { scale: 0.8 },
    },
    {
      id: "mint",
      name: "Mint",
      colors: ["#cdeee4", "#f2fbf8", "#ffffff", "#7fd1b9"],
      values: { intensity: 0.7, speed: 0.6 },
    },
  ],
  reactive: { pointer: true, scroll: false },
  cost: 2,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 4,
  provenance:
    "Written from scratch for Shadeon: summed damped ring waves as a height field with refraction and a specular glint.",
};
