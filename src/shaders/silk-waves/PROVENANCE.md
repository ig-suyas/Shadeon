# Silk Waves — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Painter's-order layering: six ribbons drawn back to front, each covering everything below its crest.
  - Crest shape from two sine waves of different frequency plus a little value noise.
  - Exponential falloff below the crest for the sheen.
  - Analytic one-and-a-half pixel edge for anti-aliasing, without derivatives.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED), all written for Shadeon.
- **License:** MIT.
