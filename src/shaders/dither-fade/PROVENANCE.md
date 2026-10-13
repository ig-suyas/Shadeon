# Dither Fade — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Ordered (Bayer) dithering. The 8x8 threshold matrix is built arithmetically by nesting the 2x2 matrix three times, rather than stored as a table.
  - Tone from fractal Brownian motion with a vertical bias, sampled on a coarse pixel grid.
  - Three-colour quantisation: each of the two transitions is dithered separately.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, FBM, SEED), all written for Shadeon.
- **License:** MIT.
