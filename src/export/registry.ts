import { SITE_URL } from "@/lib/site";
import type { ShaderMeta } from "@/shaders/schema";
import { generateExport } from "./generate";

/**
 * shadcn registry documents. Served by `src/app/r/[file]/route.ts`: the index
 * (names and descriptions only) is public, an item (the code) needs a signed
 * install link.
 */

export function registryItem(
  meta: ShaderMeta,
  source: { fragment: string; passes?: Record<string, string> },
) {
  const { code, filename } = generateExport({ meta, ...source }, "react");
  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: meta.id,
    type: "registry:component",
    title: meta.name,
    description: meta.description,
    files: [{ path: `components/shadeon/${filename}`, type: "registry:component", content: code }],
  };
}

export function registryIndex(published: readonly ShaderMeta[]) {
  return {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "shadeon",
    homepage: SITE_URL,
    items: published.map((meta) => ({
      name: meta.id,
      type: "registry:component",
      title: meta.name,
      description: meta.description,
    })),
  };
}

/** The install command for a signed-in visitor's link. */
export function installCommandFor(meta: ShaderMeta, token: string): string {
  return `npx shadcn@latest add "${SITE_URL}/r/${meta.id}.json?token=${token}"`;
}
