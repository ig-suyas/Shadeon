# Lodestone — provenance

- **Written:** 2026-10-16, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Ferrofluid model on a ground plane, simulated in screen-uv parameterisation: a mound that springs toward the magnetic field (with a depletion ring and a wave term), a spike amplitude that only rises above a critical field (Rosensweig instability), and a hexagonal lattice displacement field.
  - Layered lattice forces: inward crowding, tangential twist, drag toward the wake, curl-noise stirring and an elastic re-centring spring, with damping that depends on local energy.
  - Spikes on a hexagonal lattice with concave flanks, sheared along the local velocity, each grown from the amplitude sampled at its own centre.
  - Perspective screen-space mesh displaced in the vertex shader; per-pixel analytic normals by finite differences of the same surface function.
  - Studio lighting in direction space: two softboxes, a strip light and a rim lamp; Schlick fresnel, valley occlusion, velocity glints, contact shadow, ACES tone mapping and grain.
- **Shared chunks:** `src/studio/core.ts` (STUDIO_GLSL), all written for Shadeon.
- **License:** MIT.
