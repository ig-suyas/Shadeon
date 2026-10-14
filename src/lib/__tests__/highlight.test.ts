// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONTRAST_FIXES, highlight } from "../highlight";

function luminance(hex: string): number {
  const channels = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255);
  const [r, g, b] = channels.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
}

/** The code background in each theme, read from the design tokens so the test follows them. */
function sunkenBackgrounds(): { dark: string; light: string } {
  const css = readFileSync(path.join(process.cwd(), "src", "styles", "tokens.css"), "utf8");
  const values = [...css.matchAll(/--bg-sunken:\s*(#[0-9a-fA-F]{6})/g)].map((m) => m[1]!);
  // Dark is declared first (the default), light after it.
  return { dark: values[0]!, light: values[1]! };
}

async function themeColours(name: "github-light" | "github-dark"): Promise<string[]> {
  const theme = (await import(`shiki/themes/${name}.mjs`)).default as {
    fg?: string;
    tokenColors?: { settings?: { foreground?: string } }[];
  };
  const colours = new Set<string>();
  for (const rule of theme.tokenColors ?? []) {
    const fg = rule.settings?.foreground;
    if (fg && /^#[0-9a-fA-F]{6}/.test(fg)) colours.add(fg.slice(0, 7).toUpperCase());
  }
  if (theme.fg) colours.add(theme.fg.slice(0, 7).toUpperCase());
  return [...colours];
}

describe("code highlighting contrast", () => {
  const backgrounds = sunkenBackgrounds();

  it.each([
    ["light", "github-light"],
    ["dark", "github-dark"],
  ] as const)("every %s token colour meets WCAG AA after the fixes", async (mode, name) => {
    const fixes: Record<string, string> = CONTRAST_FIXES[mode];
    for (const colour of await themeColours(name)) {
      const used = fixes[colour] ?? colour;
      expect(
        contrast(used, backgrounds[mode]),
        `${name} ${colour} -> ${used} on ${backgrounds[mode]}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("applies the fixes to real output", async () => {
    const html = await highlight(
      "// a comment\nexport const size = 2; function go(a) { return a }",
      "tsx",
    );
    const used = [...html.matchAll(/--shiki-(light|dark):(#[0-9A-Fa-f]{6})/g)];
    expect(used.length).toBeGreaterThan(0);
    for (const [, mode, colour] of used) {
      const background = backgrounds[mode as "light" | "dark"];
      expect(contrast(colour!, background), `${mode} ${colour}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
