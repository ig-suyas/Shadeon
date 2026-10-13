/**
 * Dedicated WebGL contexts are reserved for large surfaces (hero, maximized
 * view, detail page). With the single shared gallery context this keeps the
 * whole site at three contexts or fewer.
 */
export const MAX_DEDICATED_CONTEXTS = 2;

interface Lease {
  evict: () => void;
}

const leases: Lease[] = [];

/**
 * Claims a dedicated context. If the budget is full, the oldest holder is
 * evicted (it falls back to its poster). Returns a release function.
 */
export function acquireDedicated(evict: () => void): () => void {
  const lease: Lease = { evict };
  leases.push(lease);
  while (leases.length > MAX_DEDICATED_CONTEXTS) {
    leases.shift()?.evict();
  }
  return () => {
    const index = leases.indexOf(lease);
    if (index !== -1) leases.splice(index, 1);
  };
}

export function dedicatedCount(): number {
  return leases.length;
}

/** Frees the GPU context of a canvas that is being discarded. */
export function loseContext(canvas: HTMLCanvasElement): void {
  const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
}
