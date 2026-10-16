import { loadFragment, loadMaterial } from "@/shaders/loaders";
import type { ShaderMeta } from "@/shaders/schema";

/**
 * What the code export needs from a shader's source: the fragment of a
 * single-fragment shader, or the GLSL passes of a studio material.
 */
export async function exportSource(
  meta: ShaderMeta,
): Promise<{ fragment: string; passes?: Record<string, string> }> {
  if (meta.engine === "studio") {
    const material = await loadMaterial(meta.id);
    return { fragment: "", passes: material.glsl ?? {} };
  }
  return { fragment: await loadFragment(meta.id) };
}
