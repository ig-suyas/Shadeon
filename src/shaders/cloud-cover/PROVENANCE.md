# Cloud Cover — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Cloud density from fractal Brownian motion warped by a second, slower fractal Brownian motion.
  - A threshold with a soft edge for cover.
  - Top lighting by comparing the density with a sample taken slightly higher.
  - Vertical sky gradient and one-LSB hash dither.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, FBM, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
