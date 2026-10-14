# Plasma Bloom — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Classic plasma: a sum of travelling sine waves, one of them radial around a moving point.
  - Self-warp of the sampling position before evaluating the field.
  - Four-stop palette walked forwards and back along a cosine, so it has no seam.
  - One-LSB hash dither to hide banding.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
