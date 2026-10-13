import { hexToRgb } from "@/engine/runtime";
import { SITE_URL } from "@/lib/site";
import type { ShaderMeta } from "@/shaders/schema";
import { resolveSettings, type Settings, type SettingValue } from "@/shaders/settings";
import { RUNTIME_JS, RUNTIME_TS } from "./runtime-source.generated";

/**
 * Code export: turns a shader plus the current settings into copy-ready code.
 * Pure and deterministic. The fragment and runtime strings are the same ones
 * the live preview executes.
 */

export const EXPORT_TARGETS = ["react", "vanilla", "glsl"] as const;
export type ExportTarget = (typeof EXPORT_TARGETS)[number];

export interface ExportInput {
  meta: ShaderMeta;
  fragment: string;
  /** Untrusted is fine: values are validated against the shader's controls. */
  settings?: Record<string, unknown>;
}

export interface ExportResult {
  target: ExportTarget;
  label: string;
  language: "tsx" | "javascript" | "glsl";
  filename: string;
  code: string;
}

export function componentName(id: string): string {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function shaderUrl(meta: ShaderMeta): string {
  return `${SITE_URL}/shaders/${meta.id}`;
}

export function installCommand(meta: ShaderMeta): string {
  return `npx shadcn@latest add ${SITE_URL}/r/${meta.id}.json`;
}

function templateLiteral(source: string): string {
  return "`" + source.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`";
}

function literal(value: SettingValue): string {
  if (Array.isArray(value)) return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
  return String(value);
}

function banner(meta: ShaderMeta, extra: string[] = []): string {
  const lines = [
    `${meta.name} — Shadeon`,
    meta.description,
    `${shaderUrl(meta)} · v${meta.version} · MIT License`,
    ...(extra.length ? ["", ...extra] : []),
  ];
  return ["/**", ...lines.map((line) => (line ? ` * ${line}` : " *")), " */"].join("\n");
}

const RUNTIME_NOTE =
  "// Shadeon runtime (MIT). It is identical for every Shadeon shader, so if you\n" +
  "// use several you can move it into one shared module.";

function generateGlsl(meta: ShaderMeta, fragment: string, settings: Settings): string {
  const values: string[] = [];
  settings.colors.forEach((hex, index) => {
    const [r, g, b] = hexToRgb(hex).map((channel) => channel.toFixed(3));
    values.push(`//   u_color${index + 1} = vec3(${r}, ${g}, ${b})  ${hex}`);
  });
  for (const control of meta.controls) {
    const value = settings[control.key];
    if (control.key === "speed") {
      values.push(`//   speed = ${String(value)}  (multiply elapsed seconds by this for u_time)`);
    } else if (typeof value === "boolean") {
      values.push(`//   u_${control.key} = ${value ? "1.0" : "0.0"}`);
    } else {
      values.push(`//   u_${control.key} = ${String(value)}`);
    }
  }
  return [
    `// ${meta.name} — Shadeon`,
    `// ${shaderUrl(meta)} · v${meta.version} · MIT License`,
    "//",
    "// GLSL ES 1.00 fragment shader (WebGL1 and WebGL2). Draw it on a full-screen",
    "// triangle or quad and supply the uniforms below.",
    "//",
    "// Uniform values for the current settings:",
    ...values,
    "",
    fragment.trimEnd(),
    "",
  ].join("\n");
}

function generateVanilla(meta: ShaderMeta, fragment: string, settings: Settings): string {
  const entries = Object.entries(settings).map(([key, value]) => `  ${key}: ${literal(value)},`);
  return [
    banner(meta, [
      "Usage: add this canvas, then load this file as a module script",
      `(type="module" src="./${meta.id}.js").`,
      `  <canvas id="${meta.id}" style="display:block;width:100%;height:100%"></canvas>`,
      "The canvas fills its parent, so give the parent a size.",
    ]),
    "",
    `const fragment = ${templateLiteral(fragment)};`,
    "",
    "const settings = {",
    ...entries,
    "};",
    "",
    RUNTIME_NOTE,
    RUNTIME_JS,
    "",
    `const canvas = document.getElementById("${meta.id}");`,
    `const shader = mountShader(canvas, fragment, { settings, stillTime: ${meta.stillTime} });`,
    "",
    "// Update it later with shader.set({ speed: 2 }), or call shader.pause(),",
    "// shader.play() and shader.destroy().",
    "export { shader };",
    "",
  ].join("\n");
}

function generateReact(meta: ShaderMeta, fragment: string, settings: Settings): string {
  const name = componentName(meta.id);
  const keys = ["colors", ...meta.controls.map((control) => control.key)];
  const colorTuple = `[${settings.colors.map(() => "string").join(", ")}]`;

  const propLines: string[] = [
    `  /** ${meta.colors.labels.join(", ")}. Hex colours. */`,
    `  colors?: ${colorTuple};`,
  ];
  for (const control of meta.controls) {
    const range = control.type === "float" ? ` ${control.min} to ${control.max}.` : "";
    const detail = control.description ? ` ${control.description}` : "";
    propLines.push(`  /** ${control.label}.${detail}${range} */`);
    propLines.push(`  ${control.key}?: ${control.type === "float" ? "number" : "boolean"};`);
  }
  propLines.push(
    "  /** Freeze the animation on the current frame. */",
    "  paused?: boolean;",
    "  /** Upper bound for devicePixelRatio. Lower it to save GPU time. */",
    "  maxDpr?: number;",
    "  className?: string;",
    "  style?: CSSProperties;",
  );

  const defaults = meta.controls.map(
    (control) => `  ${control.key} = ${literal(settings[control.key] ?? control.default)},`,
  );

  return [
    '"use client";',
    "",
    banner(meta, [
      `Usage: <${name} className="absolute inset-0" />`,
      "The canvas fills its parent, so give the parent a size.",
    ]),
    "",
    'import { useEffect, useRef, type CSSProperties } from "react";',
    "",
    `const fragment = ${templateLiteral(fragment)};`,
    "",
    `const DEFAULT_COLORS: ${colorTuple} = ${literal(settings.colors)};`,
    "",
    `export interface ${name}Props {`,
    ...propLines,
    "}",
    "",
    `export function ${name}({`,
    "  colors = DEFAULT_COLORS,",
    ...defaults,
    "  paused = false,",
    "  maxDpr = 2,",
    "  className,",
    "  style,",
    `}: ${name}Props) {`,
    "  const canvasRef = useRef<HTMLCanvasElement>(null);",
    "  const handleRef = useRef<ShaderHandle | null>(null);",
    "",
    "  useEffect(() => {",
    "    const canvas = canvasRef.current;",
    "    if (!canvas) return;",
    `    const handle = mountShader(canvas, fragment, { maxDpr, stillTime: ${meta.stillTime} });`,
    "    handleRef.current = handle;",
    "    return () => {",
    "      handle.destroy();",
    "      handleRef.current = null;",
    "    };",
    "  }, [maxDpr]);",
    "",
    "  useEffect(() => {",
    `    handleRef.current?.set({ ${keys.join(", ")} });`,
    `  }, [${keys.join(", ")}, maxDpr]);`,
    "",
    "  useEffect(() => {",
    "    if (paused) handleRef.current?.pause();",
    "    else handleRef.current?.play();",
    "  }, [paused, maxDpr]);",
    "",
    "  return (",
    "    <canvas",
    "      ref={canvasRef}",
    '      aria-hidden="true"',
    "      className={className}",
    '      style={{ display: "block", width: "100%", height: "100%", ...style }}',
    "    />",
    "  );",
    "}",
    "",
    RUNTIME_NOTE,
    RUNTIME_TS,
    "",
  ].join("\n");
}

export function generateExport(input: ExportInput, target: ExportTarget): ExportResult {
  const { meta, fragment } = input;
  const settings = resolveSettings(meta, input.settings);
  switch (target) {
    case "react":
      return {
        target,
        label: "React TS",
        language: "tsx",
        filename: `${meta.id}.tsx`,
        code: generateReact(meta, fragment, settings),
      };
    case "vanilla":
      return {
        target,
        label: "JavaScript",
        language: "javascript",
        filename: `${meta.id}.js`,
        code: generateVanilla(meta, fragment, settings),
      };
    case "glsl":
      return {
        target,
        label: "GLSL",
        language: "glsl",
        filename: `${meta.id}.frag`,
        code: generateGlsl(meta, fragment, settings),
      };
  }
}

export function generateAllExports(input: ExportInput): ExportResult[] {
  return EXPORT_TARGETS.map((target) => generateExport(input, target));
}
