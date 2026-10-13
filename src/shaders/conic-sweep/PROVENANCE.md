# Conic Sweep — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Angular (conic) gradient: colour chosen by the angle around a pivot, through a four-stop looping palette.
  - The pivot moves on a sine path; a value-noise warp and a radius-dependent twist bend the sweep.
  - Blend to the average colour near the pivot, where all colours would otherwise pinch together.
  - Per-pixel hash grain.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED), all written for Shadeon.
- **License:** MIT.
