# Mesh Drift — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Distance-weighted colour blending: four moving anchor points, each weighted by a Gaussian of its distance, normalised.
  - Domain warping with two value-noise fields (quintic interpolation).
  - Sine-free hashing with the common fract/dot construction; constants chosen for this project.
  - One-LSB hash dither to hide 8-bit banding.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
