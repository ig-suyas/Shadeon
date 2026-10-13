import { intensity, scale, seed, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "flow-strands",
  name: "Flow Strands",
  description:
    "Fine strands combed along a slowly shifting current, like brushed silk or wind over long grass.",
  category: "lines",
  tags: ["flow", "field", "strands", "silk", "texture", "organic"],
  colors: {
    default: ["#0e1116", "#1c2a3a", "#9fc3e6"],
    labels: ["Base, dark", "Base, light", "Strands"],
  },
  controls: [
    speed(),
    scale({
      default: 1,
      min: 0.4,
      max: 2.5,
      description: "Zoom. Higher shows more, finer strands.",
    }),
    intensity({ label: "Contrast", default: 1, min: 0.4, max: 2.5 }),
    seed(41),
  ],
  presets: [
    { id: "steel", name: "Steel", colors: ["#0e1116", "#1c2a3a", "#9fc3e6"] },
    {
      id: "wheat",
      name: "Wheat",
      colors: ["#2a1c0c", "#6b4a1e", "#f1d9a0"],
      values: { scale: 0.8 },
    },
    {
      id: "moss",
      name: "Moss",
      colors: ["#0b1410", "#173326", "#a8e0b0"],
      values: { intensity: 1.3 },
    },
    {
      id: "linen",
      name: "Linen",
      colors: ["#e9e4d8", "#d7d0c0", "#8a8371"],
      values: { intensity: 0.8, scale: 1.3 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 3,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 5,
  provenance:
    "Written from scratch for Shadeon: line integral convolution of fine noise along a noise-angle flow field.",
};
