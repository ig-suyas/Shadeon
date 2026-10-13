# Contour Field — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Fractal Brownian motion as a height field.
  - Iso-lines from the fractional part of height times level count.
  - Finite-difference slope (two extra samples) to keep lines a constant pixel width without the `OES_standard_derivatives` extension, so it runs on plain WebGL1.
- **Shared chunks:** `src/shaders/glsl/chunks.ts`, all written for Shadeon.
- **License:** MIT.
