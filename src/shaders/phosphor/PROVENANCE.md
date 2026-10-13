# Phosphor — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Barrel distortion of screen coordinates for the curved glass.
  - Cosine scanlines at a fixed device-pixel pitch.
  - A three-column mask that brightens red, green and blue in turn.
  - A Gaussian band that rolls vertically, and a quadratic vignette.
  - Value-noise colour wash as the picture.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED), all written for Shadeon.
- **License:** MIT.
