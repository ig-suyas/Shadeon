# Flow Strands — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Flow field from a noise value used as an angle.
  - Line integral convolution: fine noise averaged along the streamline in both directions with a tapering weight.
  - Contrast curve on the result; slow value noise for the base colour.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
