# Reeded Glass — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Distance-weighted colour blending between four moving anchors (the same approach as Mesh Drift) for the scene behind the glass.
  - Fluted glass as a row of lenses: the sampling position shifts in proportion to the position across each rib.
  - Groove darkening and a Gaussian highlight per rib.
  - Per-pixel hash grain.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, NOISE, SEED), all written for Shadeon.
- **License:** MIT.
