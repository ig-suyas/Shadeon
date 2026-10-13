# Liquid Chrome — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Height field from two octaves of value noise read through a noise warp.
  - Surface normal by finite differences (three height samples).
  - Procedural reflection: the reflected view vector indexes a graded backdrop and sine strip lights, in the manner of a studio environment map.
  - Rim term from the normal's tilt away from the viewer.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
