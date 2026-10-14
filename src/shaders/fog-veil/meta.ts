import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "fog-veil",
  name: "Fog Veil",
  description:
    "Thick rolling fog over a warm light. Your cursor wipes a path through it; the edges glow where the light scatters, and the fog curls back in.",
  category: "fog",
  tags: ["fog", "pointer", "reveal", "volumetric", "dark", "hero", "interactive"],
  colors: {
    default: ["#0b0d12", "#4a5262", "#1b2350", "#ffb27a"],
    labels: ["Fog in shadow", "Fog in light", "Light, deep", "Light, core"],
  },
  controls: [
    speed(1),
    scale({
      label: "Fog size",
      default: 1,
      min: 0.4,
      max: 2.5,
      description: "Higher makes the fog finer.",
    }),
    intensity({
      label: "Brush",
      default: 1,
      min: 0.4,
      max: 2.5,
      description: "How wide a path the cursor clears.",
    }),
    slider("refill", "Refill", {
      default: 1,
      min: 0.2,
      max: 3,
      description: "How quickly the fog rolls back in.",
    }),
    seed(31),
  ],
  presets: [
    { id: "harbour", name: "Harbour", colors: ["#0b0d12", "#4a5262", "#1b2350", "#ffb27a"] },
    {
      id: "absinthe",
      name: "Absinthe",
      colors: ["#070b09", "#3d5246", "#0f2a22", "#c8ff9e"],
      values: { refill: 0.7 },
    },
    {
      id: "rose-dawn",
      name: "Rose Dawn",
      colors: ["#140c10", "#5c4450", "#3a1630", "#ffc2c8"],
      values: { scale: 1.3 },
    },
    {
      id: "paper",
      name: "Paper",
      colors: ["#d9d6d0", "#f4f2ee", "#3346c8", "#ff7a4d"],
      values: { refill: 0.8, intensity: 1.2 },
    },
  ],
  reactive: { pointer: true, scroll: false },
  cost: 2,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 6,
  provenance:
    "Written from scratch for Shadeon: a frame-memory clearing field (advected, refilling, brushed along the pointer path) over domain-warped fbm fog lit by a density gradient.",
};
