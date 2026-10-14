import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "frosted-pane",
  name: "Frosted Pane",
  description:
    "Soft colour moving behind frosted glass. The frost softens the scene into a fine-grained blur, and a faint sheen crosses the pane.",
  category: "glass",
  tags: ["glass", "frosted", "blur", "soft", "premium", "hero"],
  colors: {
    default: ["#ff8fab", "#ffe5d9", "#7b9eff", "#1b1f4b"],
    labels: ["Colour 1", "Colour 2", "Colour 3", "Colour 4"],
  },
  controls: [
    speed(),
    scale({
      default: 1.2,
      min: 0.5,
      max: 3,
      description: "How folded the colour behind the glass is.",
    }),
    intensity({ label: "Scatter", default: 1, min: 0, max: 2.5 }),
    seed(88),
    slider("frost", "Frost grain", {
      default: 110,
      min: 30,
      max: 260,
      step: 5,
      description: "Higher makes the frost finer.",
    }),
  ],
  presets: [
    { id: "petal", name: "Petal", colors: ["#ff8fab", "#ffe5d9", "#7b9eff", "#1b1f4b"] },
    {
      id: "fjord",
      name: "Fjord",
      colors: ["#a8e6cf", "#dcedc1", "#3b82a0", "#0b2233"],
      values: { frost: 150 },
    },
    {
      id: "amber",
      name: "Amber",
      colors: ["#ffb347", "#ffe29a", "#c1440e", "#2a0f08"],
      values: { intensity: 1.4 },
    },
    {
      id: "mist",
      name: "Mist",
      colors: ["#e6e9f0", "#f7f8fb", "#b8c1d9", "#d4dae8"],
      values: { intensity: 0.7, frost: 80 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 2,
  tier: "pro",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-14",
  stillTime: 6,
  provenance:
    "Written from scratch for Shadeon: the shared soft scene looked up through a fine noise scatter, with a sheen band and grain.",
};
