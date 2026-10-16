import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "lodestone",
  name: "Lodestone",
  description:
    "A dish of ferrofluid with a magnet under your cursor. The fluid gathers toward it and rises into spikes that lean as you move, follow you with a lag and settle back into a glossy pool.",
  category: "liquid",
  engine: "studio",
  tags: ["ferrofluid", "magnetic", "liquid", "spikes", "pointer", "interactive", "3d"],
  colors: {
    default: ["#1b1c20", "#060709", "#dfe6ee", "#c99556"],
    light: ["#e4ddd0", "#0a0b0d", "#f4f2ec", "#c46a32"],
    labels: ["Dish", "Fluid", "Key light", "Rim light"],
  },
  controls: [
    { ...speed(1), min: 0.25, max: 2 },
    scale({
      label: "Spike density",
      default: 1,
      min: 0.6,
      max: 1.8,
      description: "Higher packs more, finer spikes.",
    }),
    intensity({
      label: "Magnet strength",
      default: 1,
      min: 0.4,
      max: 2,
      description: "How strongly the field pulls the fluid and how wide the crown grows.",
    }),
    slider("height", "Spike height", { default: 1, min: 0.3, max: 1.6 }),
    slider("swirl", "Swirl", {
      default: 0.8,
      min: 0,
      max: 2,
      description: "How far the crown twists around the magnet.",
    }),
    slider("viscosity", "Viscosity", {
      default: 1,
      min: 0.5,
      max: 2.5,
      description: "Higher is heavier: slower to follow, slower to settle.",
    }),
    seed(7),
  ],
  presets: [
    // No colours: graphite on dark pages, bone on light ones.
    { id: "studio", name: "Studio" },
    {
      id: "bone",
      name: "Bone",
      colors: ["#e4ddd0", "#0a0b0d", "#f4f2ec", "#c46a32"],
    },
    {
      id: "brass-hall",
      name: "Brass Hall",
      colors: ["#221c16", "#070605", "#f0e2c8", "#e0a25a"],
      values: { swirl: 1.2, height: 1.2 },
    },
    {
      id: "cold-lab",
      name: "Cold Lab",
      colors: ["#121619", "#040607", "#d4e4f0", "#5f8fb0"],
      values: { scale: 1.35, viscosity: 1.6 },
    },
  ],
  reactive: { pointer: true, scroll: false },
  cost: 3,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-16",
  stillTime: 0,
  provenance:
    "Written from scratch for Shadeon: a ferrofluid model with a threshold spike lattice, wake-dragged lattice displacement and studio lighting on a displaced perspective mesh.",
};
