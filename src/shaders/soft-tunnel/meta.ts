import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "soft-tunnel",
  name: "Soft Tunnel",
  description:
    "A slow flight down a ribbed tunnel towards a light. Rings travel past, the ribs twist, and the far end wanders gently.",
  category: "fractal",
  tags: ["tunnel", "depth", "rings", "motion", "hypnotic"],
  colors: {
    default: ["#0c0a1f", "#3b2a8c", "#8f7cff", "#ffe9c7"],
    labels: ["Wall, dark", "Wall, light", "Ring highlight", "Light at the end"],
  },
  controls: [
    speed(0.8),
    scale({
      label: "Ring spacing",
      default: 1,
      min: 0.4,
      max: 2.5,
      description: "Higher packs more rings into view.",
    }),
    intensity({ label: "Twist", default: 1, min: 0, max: 3 }),
    seed(6),
    slider("spokes", "Ribs", {
      default: 8,
      min: 2,
      max: 24,
      step: 1,
      description: "Number of ribs around the tunnel.",
    }),
  ],
  presets: [
    { id: "violet", name: "Violet", colors: ["#0c0a1f", "#3b2a8c", "#8f7cff", "#ffe9c7"] },
    {
      id: "furnace",
      name: "Furnace",
      colors: ["#140604", "#7a1f0e", "#ff7a2f", "#fff2c2"],
      values: { spokes: 12 },
    },
    {
      id: "ice",
      name: "Ice",
      colors: ["#04121c", "#135b7a", "#7fe3ff", "#ffffff"],
      values: { spokes: 6, intensity: 0.5 },
    },
    {
      id: "mono",
      name: "Mono",
      colors: ["#0a0a0b", "#2c2d31", "#8d9099", "#f2f2f4"],
      values: { spokes: 16, scale: 1.4 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 1,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 3,
  provenance:
    "Written from scratch for Shadeon: polar tunnel mapping (inverse radius as depth) with sine rings and twisting ribs.",
};
