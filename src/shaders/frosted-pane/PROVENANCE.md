# Frosted Pane — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - The shared soft scene (distance-weighted colour anchors) as the view behind the glass.
  - Frost as scattering: the lookup position is displaced by a fine two-channel value-noise field, and three displaced lookups are averaged into a soft blur.
  - A Gaussian sheen band across the pane and per-pixel hash grain.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED, SOFT_SCENE), all written for Shadeon.
- **License:** MIT.
