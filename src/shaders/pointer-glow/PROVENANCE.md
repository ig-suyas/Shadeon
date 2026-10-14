# Pointer Glow — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Height field from rotated sine ridges bent by low-frequency value noise (domain warping); surface normal by finite differences.
  - A point light at the pointer just above the surface: Lambert shading with inverse-square falloff.
  - A Gaussian core for the lamp itself.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
