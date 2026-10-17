import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "black-hole",
  name: "Black Hole",
  description:
    "A ray-traced black hole seen from just above its glowing disk. Gravity bends the far side of the disk over the top and a thin ring of light around the edge, while the disk turns slowly in the dark.",
  category: "space",
  tags: ["space", "black hole", "gargantua", "lensing", "disk", "dark", "hero"],
  colors: {
    default: ["#000000", "#9a4614", "#f2a873", "#fff4e8"],
    labels: ["Space", "Disk, outer", "Disk, middle", "Disk, core"],
  },
  controls: [
    speed(1),
    scale({
      label: "Size",
      default: 1,
      min: 0.4,
      max: 2,
      description: "How large the hole appears.",
    }),
    intensity({
      label: "Brightness",
      default: 1,
      min: 0.3,
      max: 2.5,
      description: "How brightly the disk burns.",
    }),
    slider("tilt", "Tilt", {
      default: 4,
      min: 2,
      max: 30,
      step: 0.5,
      description: "How far above the disk the view is, in degrees.",
    }),
    slider("x", "Horizontal position", {
      default: 0.34,
      min: -0.5,
      max: 0.5,
      step: 0.01,
      description: "Moves the hole left or right.",
    }),
    slider("y", "Vertical position", {
      default: 0.15,
      min: -0.5,
      max: 0.5,
      step: 0.01,
      description: "Moves the hole down or up.",
    }),
    seed(11),
  ],
  presets: [
    { id: "gargantua", name: "Gargantua" },
    {
      id: "centred",
      name: "Centred",
      values: { x: 0, y: 0, scale: 0.8 },
    },
    {
      id: "pale",
      name: "Pale",
      colors: ["#000000", "#5d6670", "#c9d3dc", "#f6f9fc"],
    },
    {
      id: "ember",
      name: "Ember",
      colors: ["#000000", "#6e1e08", "#e0662a", "#ffd9a8"],
      values: { intensity: 1.3, tilt: 12 },
    },
  ],
  reactive: { pointer: false, scroll: false },
  cost: 3,
  tier: "free",
  license: "MIT",
  version: "1.0.0",
  addedAt: "2026-10-17",
  stillTime: 6,
  provenance:
    "Written from scratch for Shadeon: Schwarzschild photon paths integrated per pixel in Cartesian form, crossing a thin streaked accretion disk, with a near-disk glow.",
};
