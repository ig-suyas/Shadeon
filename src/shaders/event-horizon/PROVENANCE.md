# Event Horizon — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Point-lens deflection (the thin-lens equation, simplified) of a procedural sky: fbm nebula and two layers of hashed stars.
  - Brightening near the Einstein ring; a black shadow and a thin photon ring at the horizon.
  - Accretion disk as a tilted, rotated ellipse band of fbm gas with ring streaks and a cosine beaming term; its tilt follows the pointer's velocity.
  - Soft tone mapping, film grain, vignette, one-LSB dither.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, FBM, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
