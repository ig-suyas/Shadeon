import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "flint-glass",
  name: "Flint Glass",
  description:
    "A slab of soft optical glass on an engraved print. Your cursor presses a lens into it; the print bends, splits into colour where the glass curves and the trough you leave sags back slowly.",
  category: "glass",
  engine: "studio",
  tags: ["glass", "refraction", "dispersion", "caustics", "pointer", "interactive", "print"],
  colors: {
    default: ["#13171c", "#a9b1ba", "#c38d5e", "#9fc7b4"],
    light: ["#ece6d8", "#1d2433", "#9c3b24", "#b9d6c4"],
    labels: ["Paper", "Ink", "Accent ink", "Glass tint"],
  },
  controls: [
    { ...speed(1), min: 0.25, max: 2 },
    scale({
      label: "Lens size",
      default: 1,
      min: 0.6,
      max: 1.6,
      description: "How wide the pressed lens is.",
    }),
    intensity({
      label: "Press depth",
      default: 1,
      min: 0.3,
      max: 2,
      description: "How deep the cursor presses into the glass.",
    }),
    slider("dispersion", "Dispersion", {
      default: 1,
      min: 0,
      max: 2,
      description: "How far the colours split where the glass bends.",
    }),
    slider("swirl", "Swirl", {
      default: 0.6,
      min: 0,
      max: 2,
      description: "How much the lens turns around the cursor.",
    }),
    slider("viscosity", "Viscosity", {
      default: 1,
      min: 0.5,
      max: 2.5,
      description: "Higher is stiffer glass: the trail sags back more slowly.",
    }),
    seed(3),
  ],
  presets: [
    { id: "studio", name: "Studio" },
    {
      id: "ledger",
      name: "Ledger",
      colors: ["#ece6d8", "#1d2433", "#9c3b24", "#b9d6c4"],
    },
    {
      id: "cyanotype",
      name: "Cyanotype",
      colors: ["#173a63", "#dfe8f0", "#9cc2e0", "#cfe3dc"],
      values: { dispersion: 1.3 },
    },
    {
      id: "silverpoint",
      name: "Silverpoint",
      colors: ["#e3e1dc", "#4a4f57", "#8b6f4e", "#c7d8cf"],
      values: { dispersion: 0.7, viscosity: 1.6 },
    },
  ],
  reactive: { pointer: true, scroll: false },
  cost: 2,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-16",
  stillTime: 0,
  provenance:
    "Written from scratch for Shadeon: a viscous height field of glass with six-wavelength dispersion, curvature caustics and a fresnel window over a procedural engraving.",
};
