import { intensity, scale, seed, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "pointer-glow",
  name: "Pointer Glow",
  description:
    "A softly uneven wall in the dark, lit by a lamp that follows the pointer. The light rakes across the bumps and fades with distance.",
  category: "interactive",
  tags: ["pointer", "spotlight", "interactive", "dark", "texture", "hero"],
  colors: {
    default: ["#08090c", "#7aa7ff", "#ffe6c7"],
    labels: ["Wall in shadow", "Lamp light", "Lamp core"],
  },
  controls: [
    speed(),
    scale({
      label: "Texture",
      default: 1,
      min: 0.4,
      max: 3,
      description: "Higher makes the bumps finer.",
    }),
    intensity({ label: "Reach", default: 1, min: 0.3, max: 3 }),
    seed(52),
  ],
  presets: [
    { id: "moonlit", name: "Moonlit", colors: ["#08090c", "#7aa7ff", "#ffe6c7"] },
    {
      id: "candle",
      name: "Candle",
      colors: ["#0c0705", "#ff9a4d", "#fff1c4"],
      values: { intensity: 0.8 },
    },
    {
      id: "emerald",
      name: "Emerald",
      colors: ["#04100c", "#35d6a0", "#e6fff5"],
      values: { scale: 1.5 },
    },
    {
      id: "dusk",
      name: "Dusk",
      colors: ["#0d0a14", "#b89cff", "#ffe2ef"],
      values: { intensity: 1.4, scale: 0.7 },
    },
  ],
  reactive: { pointer: true, scroll: false },
  cost: 1,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 2,
  provenance:
    "Written from scratch for Shadeon: noise-bent sine relief lit by a point light at the pointer with inverse-square falloff.",
};
