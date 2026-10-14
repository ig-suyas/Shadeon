import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "contour-field",
  name: "Contour Field",
  description:
    "Slow-moving topographic contour lines with highlighted index lines; the pointer raises a hill under itself.",
  category: "lines",
  tags: ["topographic", "contour", "lines", "map", "minimal", "pointer"],
  colors: {
    default: ["#0c0f14", "#2f3946", "#d9a85a"],
    labels: ["Background", "Lines", "Index lines"],
  },
  controls: [
    { key: "speed", type: "float", label: "Speed", default: 1, min: 0, max: 3, step: 0.05 },
    {
      key: "scale",
      type: "float",
      label: "Scale",
      description: "How much terrain is in view. Higher shows more, smaller features.",
      default: 1.6,
      min: 0.8,
      max: 6,
      step: 0.05,
    },
    {
      key: "intensity",
      type: "float",
      label: "Line weight",
      description: "Line thickness in pixels.",
      default: 1,
      min: 0.4,
      max: 3,
      step: 0.05,
    },
    { key: "seed", type: "float", label: "Seed", default: 31, min: 0, max: 999, step: 1 },
    {
      key: "levels",
      type: "float",
      label: "Levels",
      description: "Number of contour levels across the height range.",
      default: 18,
      min: 6,
      max: 48,
      step: 1,
    },
  ],
  presets: [
    { id: "survey", name: "Survey", colors: ["#0c0f14", "#2f3946", "#d9a85a"] },
    {
      id: "blueprint",
      name: "Blueprint",
      colors: ["#0a2a66", "#3f6fc4", "#eaf2ff"],
      values: { levels: 20, intensity: 0.8 },
    },
    {
      id: "chalk",
      name: "Chalk",
      colors: ["#f4f1ea", "#c9c2b4", "#2b2a27"],
      values: { levels: 16, scale: 1.8, intensity: 1.2 },
    },
    {
      id: "signal",
      name: "Signal",
      colors: ["#06110c", "#1c3a2b", "#7fdcae"],
      values: { levels: 22, scale: 2, intensity: 0.8 },
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
    "Written from scratch for Shadeon: iso-lines of a noise height field with slope-based line width.",
};
