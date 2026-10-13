# Lava Blobs — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Metaballs: each blob contributes radius squared over distance squared; the surface is where the sum crosses a threshold.
  - Blob centres on slow sine paths; the pointer is one more blob.
  - Shading from the field value: a core colour inside and a halo outside.
  - One-LSB hash dither.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
