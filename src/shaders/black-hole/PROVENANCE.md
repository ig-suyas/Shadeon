# Black Hole — provenance

- **Written:** 2026-10-17, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Per-pixel ray tracing around a Schwarzschild black hole: the photon orbit equation in Cartesian form (acceleration -1.5 h^2 x / r^5), integrated with distance-adaptive steps.
  - A thin accretion disk added at every crossing of the disk plane, front to back with opacity, which produces the lensed far side, the underside and the photon ring.
  - Disk texture from value-noise fbm in polar coordinates (seam-free through cosine and sine of the angle), slow differential rotation, a radial heat profile and a three-colour ramp.
  - A soft glow of gas near the disk accumulated along the ray, a filmic shoulder and dither.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, FBM, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
