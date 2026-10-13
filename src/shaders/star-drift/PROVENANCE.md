# Star Drift — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Jittered grid: at most one star per cell, positioned and sized by a hash of the cell id.
  - Power curve on brightness so most stars are faint and a few are bright.
  - Three layers at different densities and drift speeds for parallax, offset by the pointer.
  - Fractal Brownian motion for the dust cloud.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, FBM, SEED), all written for Shadeon.
- **License:** MIT.
