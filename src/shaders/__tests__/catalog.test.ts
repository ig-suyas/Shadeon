import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canAccess } from "@/access/can-access";
import { loaderIds, loadFragment } from "../loaders";
import { shaders } from "../registry";
import { shaderMetaSchema, type ShaderMeta } from "../schema";
import {
  applyPreset,
  changedSettings,
  defaultSettings,
  resolveSettings,
  settingsFromQuery,
  settingsToQuery,
} from "../settings";

/** Uniforms the runtime provides (not described by metadata). */
const STANDARD_UNIFORMS = [
  "time",
  "resolution",
  "pointer",
  "scroll",
  "activity",
  "velocity",
  "delta",
  "prev",
  "pass",
];

describe("catalog", () => {
  it("has unique ids and a loader for every shader", () => {
    const ids = shaders.map((shader) => shader.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...loaderIds()].sort()).toEqual([...ids].sort());
  });

  describe.each(shaders.map((shader) => [shader.id, shader] as const))("%s", (_id, shader) => {
    it("matches the metadata schema", () => {
      const result = shaderMetaSchema.safeParse(shader);
      expect(result.success ? [] : result.error.issues).toEqual([]);
    });

    it("has a provenance note", () => {
      expect(existsSync(resolve("src/shaders", shader.id, "PROVENANCE.md"))).toBe(true);
    });

    it("declares exactly the uniforms its metadata describes", async () => {
      const fragment = await loadFragment(shader.id);
      const declared = [...fragment.matchAll(/^uniform\s+\w+\s+u_(\w+);/gm)].map((m) => m[1]);
      const expected = [
        ...shader.colors.default.map((_, index) => `color${index + 1}`),
        ...shader.controls.map((control) => control.key).filter((key) => key !== "speed"),
      ];
      const custom = declared.filter((name) => !STANDARD_UNIFORMS.includes(name ?? ""));
      expect([...custom].sort()).toEqual([...expected].sort());
      expect(declared.includes("pointer")).toBe(shader.reactive.pointer);
      expect(declared.includes("scroll")).toBe(shader.reactive.scroll);
    });

    it("is a complete GLSL ES 1.00 fragment shader", async () => {
      const fragment = await loadFragment(shader.id);
      expect(fragment).toContain("precision");
      expect(fragment).toContain("void main()");
      expect(fragment).toContain("gl_FragColor");
      expect(fragment).not.toMatch(/#version|fwidth|dFdx|dFdy|texture\(/);
      expect(fragment).not.toContain("undefined");
    });

    it("is accessible on the free plan today", () => {
      expect(canAccess(shader, "free")).toBe(true);
    });
  });
});

describe("settings", () => {
  const meta = shaders[0] as ShaderMeta;

  it("starts from the shader's defaults", () => {
    const settings = defaultSettings(meta);
    expect(settings.colors).toEqual(meta.colors.default);
    for (const control of meta.controls) expect(settings[control.key]).toBe(control.default);
  });

  it("clamps, snaps and drops untrusted input", () => {
    const settings = resolveSettings(meta, {
      speed: 999,
      scale: -5,
      intensity: 0.512,
      seed: "12; DROP TABLE",
      colors: ["#FFFFFF", "javascript:alert(1)", 42],
      evil: "<script>",
    });
    const speed = meta.controls.find((control) => control.key === "speed");
    const scale = meta.controls.find((control) => control.key === "scale");
    expect(settings.speed).toBe(speed?.type === "float" ? speed.max : NaN);
    expect(settings.scale).toBe(scale?.type === "float" ? scale.min : NaN);
    expect(settings.intensity).toBe(0.5);
    expect(settings.seed).toBe(defaultSettings(meta).seed);
    expect(settings.colors).toEqual(["#ffffff", ...meta.colors.default.slice(1)]);
    expect(settings).not.toHaveProperty("evil");
  });

  it("ignores NaN and Infinity", () => {
    const settings = resolveSettings(meta, { speed: NaN, scale: Infinity });
    expect(settings).toEqual(defaultSettings(meta));
  });

  it("applies presets on top of defaults", () => {
    for (const preset of meta.presets) {
      const settings = applyPreset(meta, preset.id);
      if (preset.colors) expect(settings.colors).toEqual(preset.colors);
      for (const [key, value] of Object.entries(preset.values ?? {})) {
        expect(settings[key]).toBe(value);
      }
    }
    expect(applyPreset(meta, "missing")).toEqual(defaultSettings(meta));
  });

  it("round-trips through a query string, omitting defaults", () => {
    expect(settingsToQuery(meta, defaultSettings(meta)).toString()).toBe("");
    const custom = resolveSettings(meta, { speed: 2.5, colors: ["#112233"], seed: 400 });
    const query = settingsToQuery(meta, custom);
    expect(Object.keys(changedSettings(meta, custom)).sort()).toEqual(["colors", "seed", "speed"]);
    expect(settingsFromQuery(meta, new URLSearchParams(query.toString()))).toEqual(custom);
  });

  it("rejects hostile query values", () => {
    const settings = settingsFromQuery(meta, {
      c: "zzzzzz-<img src=x>",
      speed: "1e999",
      scale: "2.0); alert(1",
      seed: ["5", "6"],
    });
    expect(settings.colors).toEqual(meta.colors.default);
    expect(settings.speed).toBe(defaultSettings(meta).speed);
    expect(settings.scale).toBe(defaultSettings(meta).scale);
    expect(settings.seed).toBe(5);
  });
});
