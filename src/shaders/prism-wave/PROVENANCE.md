# Prism Wave — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - The shared soft scene as the view behind the glass.
  - A horizontal displacement from two sine waves and value noise running down the pane.
  - Chromatic dispersion approximated by sampling the scene three times with slightly different displacement, one per colour channel.
  - Per-pixel hash grain.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED, SOFT_SCENE), all written for Shadeon.
- **License:** MIT.
