import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "phosphor",
  name: "Phosphor",
  description:
    "A soft wash of colour shown on an old tube screen: scanlines, faint colour stripes, a slow rolling band and a slight bulge in the glass.",
  category: "grain",
  tags: ["scanlines", "crt", "retro", "screen", "vhs", "texture"],
  colors: {
    default: ["#0b1020", "#1fd6a8", "#ff4fa3"],
    labels: ["Dark", "Wash", "Accent"],
  },
  controls: [
    speed(),
    scale({
      label: "Line spacing",
      default: 3,
      min: 2,
      max: 10,
      step: 1,
      description: "Distance between scanlines in device pixels.",
    }),
    intensity({ label: "Line strength", default: 0.7, min: 0, max: 1 }),
    seed(27),
    slider("curve", "Curve", {
      default: 0.6,
      min: 0,
      max: 1.5,
      description: "How much the screen bulges.",
    }),
  ],
  presets: [
    { id: "arcade", name: "Arcade", colors: ["#0b1020", "#1fd6a8", "#ff4fa3"] },
    {
      id: "amber",
      name: "Amber",
      colors: ["#120a02", "#ff9d1c", "#ffd98a"],
      values: { scale: 4 },
    },
    {
      id: "terminal",
      name: "Terminal",
      colors: ["#020a05", "#19c36b", "#b6ffcf"],
      values: { intensity: 0.85 },
    },
    {
      id: "broadcast",
      name: "Broadcast",
      colors: ["#101018", "#4f7bff", "#f5d0ff"],
      values: { curve: 0.3, intensity: 0.5 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 1,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 4,
  provenance:
    "Written from scratch for Shadeon: noise wash under cosine scanlines, a column mask, a rolling band and barrel distortion.",
};
