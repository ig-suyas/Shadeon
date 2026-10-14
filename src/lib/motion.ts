/**
 * Motion tokens for JavaScript animation (Motion, the Web Animations API).
 * They mirror the CSS tokens in src/styles/tokens.css; change both together.
 * See context.md section 4 ("Motion") for when to use which.
 *
 * This file has no imports, so any client component can use it without
 * pulling the Motion library into its bundle.
 */

/** Cubic-bezier curves as arrays (Motion's `ease` format). */
export const EASE = {
  /** Things arriving: fast start, long soft landing. */
  enter: [0.16, 1, 0.3, 1],
  /** Things leaving: accelerate away. */
  exit: [0.55, 0, 1, 0.45],
  /** Moving between two resting states. */
  move: [0.65, 0, 0.35, 1],
} as const;

/** Durations in seconds (Motion's unit). Exits use about 70% of the enter. */
export const DURATION = {
  instant: 0.1,
  fast: 0.16,
  base: 0.24,
  slow: 0.42,
  expand: 0.48,
  reveal: 0.7,
  /** The pricing count-down. */
  count: 1.8,
} as const;

/** Delay between siblings in a staggered entrance, in seconds. */
export const STAGGER = 0.06;

/** Distance in pixels that revealed content travels. */
export const REVEAL_DISTANCE = 20;

/** Springs for things that follow the pointer or settle physically. */
export const SPRING = {
  /** Panels, tabs, the active-tab indicator: quick, no overshoot. */
  ui: { type: "spring", stiffness: 380, damping: 36, mass: 1 },
  /** Lifts and gentle settles: soft, a hint of overshoot. */
  soft: { type: "spring", stiffness: 160, damping: 22, mass: 1 },
} as const;

/** Pointer easing for shaders: fraction of the remaining distance closed per 60 fps frame. */
export const POINTER_FOLLOW = 0.06;
