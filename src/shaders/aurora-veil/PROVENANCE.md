# Aurora Veil — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Fractal Brownian motion to sway each curtain's lower edge.
  - Exponential falloff above the edge for the long upward fade.
  - Stretched value noise for vertical rays.
  - Exponential tone curve (`1 - exp(-x)`) so overlapping light rolls off instead of clipping.
- **Shared chunks:** `src/shaders/glsl/chunks.ts`, all written for Shadeon.
- **License:** MIT.
