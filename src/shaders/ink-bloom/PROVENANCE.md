# Ink Bloom — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Frame memory (ping-pong textures) holding premultiplied ink: colour times amount, and the amount.
  - Semi-Lagrangian advection along a divergence-free current: the curl of two octaves of value noise, plus the pointer's velocity near it.
  - Slow dissipation and a little neighbour averaging, so plumes soften as they spread.
  - Pigment pooling: darker edges from the gradient of the ink amount; multiply over paper in light palettes, a faint glow in dark ones.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
