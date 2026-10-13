# Julia Drift — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - The Julia set of z squared plus c, a mathematical object, with c moving on a circle of radius 0.7885.
  - Escape-time iteration (56 steps) with the standard fractional (smooth) iteration count to remove banding.
  - A three-stop colour ramp on the smoothed count, and a separate colour for points that never escape.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
