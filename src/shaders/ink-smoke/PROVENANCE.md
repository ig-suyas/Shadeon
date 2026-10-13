# Ink Smoke — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Nested domain warping: fractal Brownian motion sampled at a position displaced by fractal Brownian motion, twice.
  - Colour from the final density and from the length of the displacement vectors.
  - One-LSB hash dither.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, FBM, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
