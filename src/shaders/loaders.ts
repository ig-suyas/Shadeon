/**
 * One dynamic import per shader, so each fragment is its own chunk.
 *
 * This is also the seam for future Pro gating: a Pro shader's loader can fetch
 * its source from an authenticated endpoint instead of a public chunk.
 */
const loaders: Record<string, () => Promise<{ fragment: string }>> = {
  "mesh-drift": () => import("./mesh-drift/fragment"),
  "aurora-veil": () => import("./aurora-veil/fragment"),
  "contour-field": () => import("./contour-field/fragment"),
};

const cache = new Map<string, Promise<string>>();

export function loadFragment(id: string): Promise<string> {
  let pending = cache.get(id);
  if (!pending) {
    const loader = loaders[id];
    pending = loader
      ? loader().then((module) => module.fragment)
      : Promise.reject(new Error(`Unknown shader "${id}"`));
    // A failed load (for example a dropped connection) can be retried later.
    pending.catch(() => cache.delete(id));
    cache.set(id, pending);
  }
  return pending;
}

export function loaderIds(): string[] {
  return Object.keys(loaders);
}
