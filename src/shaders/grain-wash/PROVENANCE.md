# Grain Wash — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Two fractal Brownian motion fields blending three tones.
  - Film grain from a per-pixel hash that is re-seeded 24 times a second, weighted towards mid-tones.
  - Radial vignette with smoothstep.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, FBM, SEED), all written for Shadeon.
- **License:** MIT.
