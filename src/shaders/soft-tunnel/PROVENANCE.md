# Soft Tunnel — provenance

- **Written:** 2026-10-14, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Polar tunnel mapping: inverse radius as depth, angle as position around the wall.
  - Sine rings along depth and sine ribs around the angle, with the rib phase tied to depth for twist. The rib count is rounded to an integer so there is no seam.
  - Blend to a light colour near the vanishing point and a fall-off towards the edges.
  - One-LSB hash dither.
- **Shared chunks:** `src/shaders/glsl/chunks.ts` (HEADER, HASH, SEED, DITHER), all written for Shadeon.
- **License:** MIT.
