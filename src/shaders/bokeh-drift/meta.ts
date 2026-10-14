import { intensity, scale, seed, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "bokeh-drift",
  name: "Bokeh Drift",
  description:
    "Out-of-focus lights at three depths, drifting and gently pulsing like a city seen through a lens at night.",
  category: "particles",
  tags: ["bokeh", "lights", "night", "soft", "city", "blur"],
  colors: {
    default: ["#070912", "#141a33", "#ffb86b", "#ff5d8f"],
    labels: ["Background, bottom", "Background, top", "Lights A", "Lights B"],
  },
  controls: [
    speed(),
    scale({
      label: "Density",
      default: 1,
      min: 0.5,
      max: 2.5,
      description: "Higher shows more, smaller lights.",
    }),
    intensity({ label: "Brightness", default: 1, min: 0.2, max: 2 }),
    seed(31),
  ],
  presets: [
    { id: "city", name: "City", colors: ["#070912", "#141a33", "#ffb86b", "#ff5d8f"] },
    {
      id: "harbour",
      name: "Harbour",
      colors: ["#03101a", "#0a2a3d", "#7fe7ff", "#fff3c4"],
      values: { scale: 0.8 },
    },
    {
      id: "festive",
      name: "Festive",
      colors: ["#0d0508", "#2a0c16", "#ffd166", "#ef476f"],
      values: { scale: 1.3, intensity: 1.2 },
    },
    {
      id: "pastel",
      name: "Pastel",
      colors: ["#4b4766", "#7d76a0", "#ffc8dd", "#bde0fe"],
      values: { intensity: 1, scale: 0.8 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 3,
  tier: "pro",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 7,
  provenance:
    "Written from scratch for Shadeon: three jittered grids of rimmed discs with neighbour lookup, additive with a soft roll-off.",
};
