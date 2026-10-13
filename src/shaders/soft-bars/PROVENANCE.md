# Soft Bars — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - A four-stop looping palette indexed by horizontal position.
  - The index is offset by two sine waves and by value noise that varies with height, so bar edges sway.
  - A sine brightness profile from bottom to top, and one-LSB hash dither.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
