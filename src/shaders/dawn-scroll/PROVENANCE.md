# Dawn Scroll — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Sky as a power-curve blend between a zenith and a horizon colour, both driven by a time-of-day value.
  - Time of day from page scroll progress plus an offset control.
  - Sun as two exponential lobes (core and glow).
  - Fractal Brownian motion stretched horizontally for haze bands.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, FBM, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
