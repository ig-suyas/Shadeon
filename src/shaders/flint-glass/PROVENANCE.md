# Flint Glass — provenance

- **Written:** 2026-10-16, from scratch for Shadeon. No code was copied or ported from Shadertoy, CodePen, or any other library.
- **Techniques used (general, published techniques, not code):**
  - Viscous height field of a glass surface in frame memory: a pressed dimple with a lip of displaced glass, advected by the wake and a tangential swirl, relaxed by a weak spring and a Laplacian, with energy-dependent damping; a tap rings once.
  - Screen-space refraction of a procedural engraving (antialiased line families: hatching, two guilloche rosettes, a ruled frame) through the surface gradient.
  - Six-wavelength dispersion: a Cauchy-style index per wavelength and Gaussian spectral weights, so colour appears only where the surface bends.
  - Curvature caustics from the Laplacian of the height field, a rounded bevel, a soda-green tint by glass thickness, a mullioned window reflected with Schlick fresnel, curl-noise heat shimmer, ACES tone mapping and grain.
- **Shared chunks:** `src/studio/core.ts` (STUDIO_GLSL), all written for Shadeon.
- **License:** MIT.
