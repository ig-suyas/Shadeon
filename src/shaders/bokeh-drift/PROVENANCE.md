# Bokeh Drift — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Jittered grid of discs with a 3x3 neighbour search so discs can overlap cell borders.
  - Disc with a brighter rim, the shape a defocused point light makes.
  - Three layers at different sizes and drift speeds, added together.
  - Exponential roll-off on the sum, and a hash test that leaves some cells dark.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
