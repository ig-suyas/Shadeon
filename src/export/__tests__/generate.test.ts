import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { loadFragment } from "@/shaders/loaders";
import { shaders } from "@/shaders/registry";
import { applyPreset, defaultSettings, type Settings } from "@/shaders/settings";
import { buildRuntimeSource, OUTPUT } from "../../../scripts/runtime-source.mjs";
import { componentName, EXPORT_TARGETS, generateAllExports, generateExport } from "../generate";
import { installCommandFor, registryIndex } from "../registry";
import { RUNTIME_JS, RUNTIME_TS } from "../runtime-source.generated";

/** Evaluates a template literal from generated code back into its string value. */
function readTemplateLiteral(code: string, name: string): string {
  const match = code.match(new RegExp(`const ${name} = (\`(?:[^\`\\\\]|\\\\[\\s\\S])*\`);`));
  if (!match?.[1]) throw new Error(`no template literal "${name}" in generated code`);
  return new Function(`return ${match[1]}`)() as string;
}

describe("runtime source", () => {
  it("is up to date with src/engine/runtime.ts", () => {
    const committed = readFileSync(OUTPUT, "utf8").replace(/\r\n/g, "\n");
    expect(committed).toBe(buildRuntimeSource());
  });

  it("is self-contained: no imports or exports", () => {
    for (const source of [RUNTIME_TS, RUNTIME_JS]) {
      expect(source).not.toMatch(/^\s*(import|export)\s/m);
      expect(source).toContain("function mountShader(");
    }
  });

  it("is plain JavaScript in the vanilla build", () => {
    expect(() => new Function(RUNTIME_JS)).not.toThrow();
    expect(RUNTIME_JS).not.toMatch(/: (GL|ShaderProgram|ShaderSettings)\b/);
  });
});

describe("naming", () => {
  it("derives a component name from the id", () => {
    expect(componentName("mesh-drift")).toBe("MeshDrift");
    expect(componentName("plasma")).toBe("Plasma");
  });

  it("builds the signed registry install command and a code-free index", () => {
    const meta = shaders[0];
    if (!meta) throw new Error("catalog is empty");
    expect(installCommandFor(meta, "abc")).toMatch(
      new RegExp(`^npx shadcn@latest add "https://[^ ]+/r/${meta.id}\\.json\\?token=abc"$`),
    );
    const index = JSON.stringify(registryIndex(shaders));
    expect(index).not.toContain("gl_FragColor");
    expect(index).not.toContain("void main");
  });
});

describe.each(shaders.map((shader) => [shader.id, shader] as const))("export %s", (_id, meta) => {
  it("returns one result per target with the right file type", async () => {
    const fragment = await loadFragment(meta.id);
    const results = generateAllExports({ meta, fragment });
    expect(results.map((result) => result.target)).toEqual([...EXPORT_TARGETS]);
    expect(results.map((result) => result.filename)).toEqual([
      `${meta.id}.tsx`,
      `${meta.id}.js`,
      `${meta.id}.frag`,
    ]);
  });

  it("is deterministic", async () => {
    const fragment = await loadFragment(meta.id);
    for (const target of EXPORT_TARGETS) {
      const a = generateExport({ meta, fragment }, target).code;
      const b = generateExport({ meta, fragment }, target).code;
      expect(a).toBe(b);
    }
  });

  it("embeds the exact fragment source the preview runs", async () => {
    const fragment = await loadFragment(meta.id);
    const react = generateExport({ meta, fragment }, "react").code;
    const vanilla = generateExport({ meta, fragment }, "vanilla").code;
    const glsl = generateExport({ meta, fragment }, "glsl").code;
    expect(readTemplateLiteral(react, "fragment")).toBe(fragment);
    expect(readTemplateLiteral(vanilla, "fragment")).toBe(fragment);
    expect(glsl).toContain(fragment.trimEnd());
  });

  it("embeds the exact runtime the preview runs", async () => {
    const fragment = await loadFragment(meta.id);
    expect(generateExport({ meta, fragment }, "react").code).toContain(RUNTIME_TS);
    expect(generateExport({ meta, fragment }, "vanilla").code).toContain(RUNTIME_JS);
  });

  it("carries the name, link and MIT notice in every output", async () => {
    const fragment = await loadFragment(meta.id);
    for (const result of generateAllExports({ meta, fragment })) {
      expect(result.code).toContain(meta.name);
      expect(result.code).toContain(`/shaders/${meta.id}`);
      expect(result.code).toContain("MIT License");
    }
  });

  it("bakes the current settings into each output", async () => {
    const fragment = await loadFragment(meta.id);
    const preset = meta.presets[meta.presets.length - 1];
    if (!preset) throw new Error("shader has no presets");
    const settings: Settings = { ...applyPreset(meta, preset.id), speed: 2.35 };
    const react = generateExport({ meta, fragment, settings }, "react").code;
    const vanilla = generateExport({ meta, fragment, settings }, "vanilla").code;
    const glsl = generateExport({ meta, fragment, settings }, "glsl").code;
    const colors = `[${settings.colors.map((hex) => `"${hex}"`).join(", ")}]`;
    expect(react).toContain(`= ${colors};`);
    expect(react).toContain("  speed = 2.35,");
    expect(vanilla).toContain(`  colors: ${colors},`);
    expect(vanilla).toContain("  speed: 2.35,");
    expect(glsl).toContain("speed = 2.35");
    expect(glsl).toContain(settings.colors[0]);
    for (const control of meta.controls) {
      expect(react).toContain(`  ${control.key} = ${String(settings[control.key])},`);
    }
  });

  it("never lets untrusted settings into the generated code", async () => {
    const fragment = await loadFragment(meta.id);
    const hostile = {
      colors: ['"];alert(1);//', "#00ff00"],
      speed: "1; fetch('https://evil.example')",
      __proto__: { polluted: true },
      "x</script><script>alert(1)</script>": 1,
    };
    for (const target of EXPORT_TARGETS) {
      const code = generateExport({ meta, fragment, settings: hostile }, target).code;
      expect(code).not.toContain("alert(1)");
      expect(code).not.toContain("evil.example");
      expect(code).not.toContain("</script>");
      expect(code).not.toContain("polluted");
    }
    const react = generateExport({ meta, fragment, settings: hostile }, "react").code;
    expect(react).toContain(`  speed = ${String(defaultSettings(meta).speed)},`);
  });

  it("produces vanilla JavaScript that parses", async () => {
    const fragment = await loadFragment(meta.id);
    const { code } = generateExport({ meta, fragment }, "vanilla");
    // `new Function` cannot parse module syntax, so drop the one export line.
    expect(() => new Function(code.replace(/^export \{ shader \};$/m, ""))).not.toThrow();
  });
});

describe("generated React components", () => {
  it("type-check under strict TypeScript", async () => {
    const directory = resolve("node_modules/.cache/shadeon-export-check");
    mkdirSync(directory, { recursive: true });
    const files: string[] = [];
    for (const meta of shaders) {
      const fragment = await loadFragment(meta.id);
      const result = generateExport({ meta, fragment }, "react");
      const file = resolve(directory, result.filename);
      writeFileSync(file, result.code);
      files.push(file);
      // A consumer file checks the public props typing.
      const name = componentName(meta.id);
      const usage = resolve(directory, `${meta.id}.usage.tsx`);
      writeFileSync(
        usage,
        [
          `import { ${name} } from "./${meta.id}";`,
          `export const a = <${name} />;`,
          `export const b = <${name} className="absolute inset-0" speed={0.5} paused maxDpr={1} />;`,
          "// @ts-expect-error speed must be a number",
          `export const c = <${name} speed="fast" />;`,
          "",
        ].join("\n"),
      );
      files.push(usage);
    }
    const program = ts.createProgram(files, {
      strict: true,
      noUncheckedIndexedAccess: true,
      noUnusedLocals: false,
      noEmit: true,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ["lib.es2020.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
      skipLibCheck: true,
      types: ["react"],
    });
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    expect(diagnostics).toEqual([]);
  });
});
