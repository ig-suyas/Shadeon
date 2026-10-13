// Writes one shadcn registry item per shader to public/r/<id>.json, so a shader
// installs with:  npx shadcn@latest add https://<site>/r/<id>.json
// The file content is the same React export the site shows in its code panel.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { canAccess } from "@/access/can-access";
import { generateExport } from "@/export/generate";
import { SITE_URL } from "@/lib/site";
import { loadFragment } from "@/shaders/loaders";
import { shaders } from "@/shaders/registry";

const outDir = resolve(process.cwd(), "public/r");

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  for (const file of readdirSync(outDir)) {
    if (file.endsWith(".json")) rmSync(resolve(outDir, file));
  }

  // Shaders that the free plan cannot access are never written to public files.
  const published = shaders.filter((shader) => canAccess(shader, "free"));
  for (const meta of published) {
    const fragment = await loadFragment(meta.id);
    const { code, filename } = generateExport({ meta, fragment }, "react");
    const item = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: meta.id,
      type: "registry:component",
      title: meta.name,
      description: meta.description,
      files: [
        {
          path: `components/shadeon/${filename}`,
          type: "registry:component",
          content: code,
        },
      ],
    };
    writeFileSync(resolve(outDir, `${meta.id}.json`), `${JSON.stringify(item, null, 2)}\n`);
  }

  const index = {
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
  writeFileSync(resolve(outDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`wrote ${published.length} registry items to public/r`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
