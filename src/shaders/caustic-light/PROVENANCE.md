# Caustic Light — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Ridged value noise (bright where the noise crosses its midpoint) to draw thin wandering lines.
  - The product of two ridged fields, raised to a power, so light concentrates where lines meet.
  - A value-noise warp of the sampling position, and two scales of the pattern drifting in opposite directions.
  - One-LSB hash dither.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
