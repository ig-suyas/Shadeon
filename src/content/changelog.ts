export interface Release {
  /** ISO date. */
  date: string;
  title: string;
  changes: string[];
}

/** Newest first. Add an entry whenever something visible to visitors ships. */
export const releases: Release[] = [
  {
    date: "2026-10-14",
    title: "Interactive shaders",
    changes: [
      "Every shader now responds to the cursor. Three new ones: Fog Veil (wipe through rolling fog), Ink Bloom (pour ink into swirling water) and Event Horizon (a black hole that bends the stars).",
      "Shaders can now remember their previous frame, which is what lets fog, ink and trails persist and drift.",
      "A new home page with a liquid sculpture you can stir, and a simpler gallery with one category filter.",
      "Smoother movement throughout: pages fade between each other, sections ease in as you scroll, and the code tabs slide.",
    ],
  },
  {
    date: "2026-10-14",
    title: "First preview",
    changes: [
      "Gallery with a full-screen view for each shader.",
      "Code for every shader as a React TS component, plain JavaScript and raw GLSL.",
      "A page per shader with a live customizer, presets, randomize and shareable links.",
      "Install with the shadcn CLI from a registry file per shader.",
      "Light and dark themes.",
    ],
  },
];

export interface RoadmapItem {
  title: string;
  detail: string;
}

/** Intentions, not promises: no dates. */
export const roadmap: { now: RoadmapItem[]; next: RoadmapItem[]; later: RoadmapItem[] } = {
  now: [
    {
      title: "Polish for launch",
      detail: "Speed, accessibility and testing on real phones and other browsers.",
    },
    {
      title: "Pointer and scroll reactive backgrounds",
      detail: "More shaders that respond to the visitor without any wiring.",
    },
  ],
  next: [
    {
      title: "Preview images for sharing",
      detail: "A picture of each shader when its link is posted in chat or on social sites.",
    },
    {
      title: "Runtime as a separate file",
      detail:
        "An export option for projects that use several shaders and want to share one runtime.",
    },
  ],
  later: [
    {
      title: "Shadeon Pro",
      detail: "A paid set of more elaborate shaders. Details and pricing are not decided yet.",
    },
  ],
};
