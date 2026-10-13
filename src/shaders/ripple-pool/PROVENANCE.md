# Ripple Pool — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Height field as a sum of damped ring waves from the pointer and two wandering points.
  - Surface normal by finite differences.
  - Refraction approximated by offsetting the lookup of the pool floor along the normal.
  - Lambert shading, a Phong-style glint and a rim term.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
