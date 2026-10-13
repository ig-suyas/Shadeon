import { describe, expect, it } from "vitest";
import { hexToHsl, hslToHex, isHex } from "@/lib/color";
import { shaders } from "../registry";
import { relatedShaders } from "../related";
import type { ShaderMeta } from "../schema";
import { defaultSettings, randomizeSettings, resolveSettings } from "../settings";

/** Small deterministic generator so randomized results are repeatable. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("colour helpers", () => {
  it("validates hex", () => {
    expect(isHex("#a1B2c3")).toBe(true);
    expect(isHex("#abc")).toBe(false);
    expect(isHex("a1b2c3")).toBe(false);
    expect(isHex("#a1b2cg")).toBe(false);
  });

  it("round-trips through HSL", () => {
    for (const hex of ["#000000", "#ffffff", "#ff6b3d", "#0b1026", "#22e3a6", "#808080"]) {
      expect(hslToHex(hexToHsl(hex))).toBe(hex);
    }
  });

  it("wraps hue and clamps saturation and lightness", () => {
    expect(hslToHex({ h: 360 + 120, s: 2, l: 0.5 })).toBe("#00ff00");
    expect(hslToHex({ h: -120, s: 1, l: 0.5 })).toBe("#0000ff");
    expect(hslToHex({ h: 10, s: 1, l: 4 })).toBe("#ffffff");
  });
});

describe.each(shaders.map((shader) => [shader.id, shader] as const))(
  "randomize %s",
  (_id, meta) => {
    it("always produces valid settings", () => {
      for (let seed = 1; seed <= 40; seed++) {
        const settings = randomizeSettings(meta, defaultSettings(meta), seeded(seed));
        expect(resolveSettings(meta, settings)).toEqual(settings);
        expect(settings.colors).toHaveLength(meta.colors.default.length);
        for (const color of settings.colors) expect(isHex(color)).toBe(true);
      }
    });

    it("is repeatable for the same random source", () => {
      const a = randomizeSettings(meta, defaultSettings(meta), seeded(7));
      const b = randomizeSettings(meta, defaultSettings(meta), seeded(7));
      expect(a).toEqual(b);
    });

    it("keeps each colour's lightness, so the shader keeps its character", () => {
      const settings = randomizeSettings(meta, defaultSettings(meta), seeded(3));
      meta.colors.default.forEach((hex, index) => {
        const before = hexToHsl(hex).l;
        const after = hexToHsl(settings.colors[index] ?? "").l;
        expect(Math.abs(before - after)).toBeLessThan(0.02);
      });
    });

    it("leaves the speed alone and changes the look", () => {
      const base = defaultSettings(meta);
      const settings = randomizeSettings(meta, base, seeded(11));
      expect(settings.speed).toBe(base.speed);
      expect(settings).not.toEqual(base);
    });
  },
);

describe("relatedShaders", () => {
  const template = shaders[0] as ShaderMeta;
  const make = (id: string, patch: Partial<ShaderMeta>): ShaderMeta => ({
    ...template,
    id,
    ...patch,
  });
  const all = [
    make("a", { category: "lines", tags: ["x", "y"] }),
    make("b", { category: "lines", tags: ["z"] }),
    make("c", { category: "gradient", tags: ["x", "y"] }),
    make("d", { category: "gradient", tags: ["x"] }),
    make("e", { category: "plasma", tags: [] }),
  ];

  it("never includes the shader itself", () => {
    const subject = all[0] as ShaderMeta;
    expect(relatedShaders(subject, all).map((s) => s.id)).not.toContain("a");
  });

  it("prefers the same category, then shared tags, and respects the limit", () => {
    const subject = all[0] as ShaderMeta;
    expect(relatedShaders(subject, all).map((s) => s.id)).toEqual(["b", "c", "d"]);
    expect(relatedShaders(subject, all, 1).map((s) => s.id)).toEqual(["b"]);
  });

  it("works for the real catalog", () => {
    for (const shader of shaders) {
      const related = relatedShaders(shader, shaders);
      expect(related.length).toBeLessThanOrEqual(3);
      expect(related.every((other) => other.id !== shader.id)).toBe(true);
    }
  });
});
