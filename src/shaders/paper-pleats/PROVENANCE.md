# Paper Pleats — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - A repeating shading profile along a rotated axis: a lit face, a shaded face and a narrow Gaussian highlight at the fold.
  - Value noise shifts the profile along the pleat so the folds wander.
  - Per-pleat tint from value noise of the pleat index.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
