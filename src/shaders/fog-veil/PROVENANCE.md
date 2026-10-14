# Fog Veil — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Frame memory (ping-pong textures): a per-pixel clearing amount that is advected along a slow value-noise flow and refills at a noise-varied rate.
  - Pointer brush as a soft capsule along the segment the pointer travelled this frame, widened by speed; an idle phantom brush on a Lissajous path.
  - Fog from domain-warped fbm, lit by the density difference toward the light (a cheap self-shadow).
  - Scattering glow where the fog is half cleared, film grain, vignette, one-LSB dither.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, FBM, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
