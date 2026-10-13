# Horizon Grid — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - A ground plane in perspective computed analytically: depth is the reciprocal of the distance below the horizon.
  - Anti-aliased grid lines without derivatives: the size of a pixel in grid cells is computed from the projection, and lines fade out when they become thinner than a pixel.
  - Exponential distance fog and an exponential horizon glow.
  - Forward travel from time plus page scroll progress.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
