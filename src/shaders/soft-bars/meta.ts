import { intensity, scale, seed, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "soft-bars",
  name: "Soft Bars",
  description:
    "Tall, blurred bars of colour that sway and slide into each other, like light through coloured blinds.",
  category: "gradient",
  tags: ["bars", "stripes", "gradient", "soft", "minimal", "hero"],
  colors: {
    default: ["#0f172a", "#2563eb", "#93c5fd", "#f8fafc"],
    labels: ["Colour 1", "Colour 2", "Colour 3", "Colour 4"],
  },
  controls: [
    speed(),
    scale({
      label: "Bars",
      default: 1,
      min: 0.4,
      max: 3,
      description: "Higher shows more, narrower bars.",
    }),
    intensity({ label: "Sway", default: 1, min: 0, max: 2.5 }),
    seed(16),
  ],
  presets: [
    { id: "cobalt", name: "Cobalt", colors: ["#0f172a", "#2563eb", "#93c5fd", "#f8fafc"] },
    {
      id: "sunrise",
      name: "Sunrise",
      colors: ["#3b0a45", "#e94560", "#ffb26b", "#ffe9c9"],
      values: { scale: 0.8 },
    },
    {
      id: "forest",
      name: "Forest",
      colors: ["#081c15", "#2d6a4f", "#95d5b2", "#f1faee"],
      values: { intensity: 1.4 },
    },
    {
      id: "graphite",
      name: "Graphite",
      colors: ["#0b0b0d", "#3f4147", "#9a9da6", "#e9eaee"],
      values: { scale: 1.5, speed: 0.7 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 1,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 5,
  provenance:
    "Written from scratch for Shadeon: a looping palette indexed by x through sine and noise offsets.",
};
