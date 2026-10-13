import type { ShaderMeta } from "./schema";
import { meta as auroraVeil } from "./aurora-veil/meta";
import { meta as contourField } from "./contour-field/meta";
import { meta as meshDrift } from "./mesh-drift/meta";

/**
 * The catalog: metadata only. GLSL is loaded per shader through `loaders.ts`,
 * so listing pages never pay for fragment source they do not show.
 */
export const shaders: readonly ShaderMeta[] = [meshDrift, auroraVeil, contourField];

const byId = new Map(shaders.map((shader) => [shader.id, shader]));

export function getShader(id: string): ShaderMeta | undefined {
  return byId.get(id);
}

export function featuredShaders(): ShaderMeta[] {
  return shaders.filter((shader) => shader.featured);
}
