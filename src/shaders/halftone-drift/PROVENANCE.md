# Halftone Drift — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Amplitude-modulated halftone screen: a rotated grid with one dot per cell.
  - Tone sampled once per cell at the dot centre, as a printing screen does.
  - Dot radius proportional to the square root of tone, so ink coverage tracks tone.
  - Analytic one-pixel edge for anti-aliasing, without derivatives.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, FBM, SEED), all written for Shadeon.
- **License:** MIT.
