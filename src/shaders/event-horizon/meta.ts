import { intensity, scale, seed, slider, speed } from "../controls";
import type { ShaderMeta } from "../schema";

export const meta: ShaderMeta = {
  id: "event-horizon",
  name: "Event Horizon",
  description:
    "A black hole with a burning photon ring and a spinning disk of hot gas. Move your cursor and the stars slide behind it, bending into arcs around the hole.",
  category: "space",
  tags: ["space", "black hole", "stars", "pointer", "dark", "hero", "interactive"],
  colors: {
    default: ["#03040a", "#26305e", "#ff7a3d", "#ffe7b8"],
    labels: ["Space", "Nebula", "Disk, outer", "Disk, inner"],
  },
  controls: [
    speed(1),
    scale({
      label: "Sky scale",
      default: 1,
      min: 0.5,
      max: 2.5,
      description: "Higher makes the nebula and stars smaller.",
    }),
    intensity({
      label: "Mass",
      default: 1,
      min: 0.5,
      max: 2,
      description: "Size of the hole and the strength of the lensing.",
    }),
    slider("disk", "Disk", {
      default: 1,
      min: 0,
      max: 2,
      description: "Brightness and width of the accretion disk.",
    }),
    slider("x", "Horizontal position", {
      default: 0,
      min: -0.5,
      max: 0.5,
      step: 0.01,
      description: "Moves the hole left or right.",
    }),
    slider("y", "Vertical position", {
      default: 0,
      min: -0.5,
      max: 0.5,
      step: 0.01,
      description: "Moves the hole down or up.",
    }),
    seed(7),
  ],
  presets: [
    { id: "gargantua", name: "Gargantua", colors: ["#03040a", "#26305e", "#ff7a3d", "#ffe7b8"] },
    {
      id: "blue-giant",
      name: "Blue Giant",
      colors: ["#02040a", "#1b2f4f", "#3f8cff", "#d9f1ff"],
      values: { disk: 1.3 },
    },
    {
      id: "magenta",
      name: "Magenta",
      colors: ["#07030a", "#3a1640", "#ff3f8e", "#ffd2e6"],
      values: { intensity: 1.2 },
    },
    {
      id: "quiet",
      name: "Quiet",
      colors: ["#040405", "#1c1c22", "#9a8f80", "#f4efe6"],
      values: { disk: 0.5, scale: 1.4 },
    },
  ],
  reactive: { pointer: true, scroll: false },
  cost: 2,
  tier: "free",
  license: "MIT",
  version: "1.1.0",
  addedAt: "2026-10-14",
  stillTime: 4,
  provenance:
    "Written from scratch for Shadeon: point-lens deflection of a procedural sky (fbm nebula, hashed stars) with pointer parallax, an Einstein-ring brightening, a tilted fbm accretion disk with beaming, and a photon ring.",
};
