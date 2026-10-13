# Light Leak — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Three elliptical Gaussian glows whose centres drift on sine paths near the frame edges.
  - Screen blending so overlapping light rolls off instead of clipping.
  - A small value-noise warp of the plane so the glows are not perfect ellipses.
  - Time-stepped hash grain.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED), all written for Shadeon.
- **License:** MIT.
