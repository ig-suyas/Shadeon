import type { HighlighterCore } from "shiki/core";

export type CodeLanguage = "tsx" | "javascript" | "glsl";

let highlighter: Promise<HighlighterCore> | null = null;

/**
 * Shiki, trimmed to three grammars and two themes and loaded on first use, so
 * no highlighting code ships until someone opens a code panel.
 */
function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
    ]);
    return createHighlighterCore({
      themes: [import("shiki/themes/github-light.mjs"), import("shiki/themes/github-dark.mjs")],
      langs: [
        import("shiki/langs/tsx.mjs"),
        import("shiki/langs/javascript.mjs"),
        import("shiki/langs/glsl.mjs"),
      ],
      engine: createJavaScriptRegexEngine(),
    });
  })();
  highlighter.catch(() => {
    highlighter = null;
  });
  return highlighter;
}

/**
 * Token colours from the GitHub themes that fall below WCAG AA (4.5:1) on our
 * code background, mapped to a deeper (light theme) or brighter (dark theme)
 * shade of the same hue. A test checks every colour in both themes.
 */
export const CONTRAST_FIXES = {
  light: {
    "#E36209": "#A84E06",
    "#D73A49": "#C42B38",
    "#22863A": "#176F2C",
    "#6A737D": "#57606A",
    "#F6F8FA": "#24292E",
    "#FAFBFC": "#24292E",
  },
  dark: {
    "#6A737D": "#8B949E",
    "#24292E": "#D1D5DA",
    "#2F363D": "#D1D5DA",
  },
} as const;

/** Applies CONTRAST_FIXES to Shiki HTML. Every highlighter on the site must use it. */
export function fixContrast(html: string): string {
  return html.replace(
    /--shiki-(light|dark):(#[0-9A-Fa-f]{6})/g,
    (match, theme: "light" | "dark", colour: string) => {
      const fixes: Record<string, string> = CONTRAST_FIXES[theme];
      const fixed = fixes[colour.toUpperCase()];
      return fixed ? `--shiki-${theme}:${fixed}` : match;
    },
  );
}

/**
 * Returns highlighted HTML. Shiki escapes the source, and both colour themes
 * are emitted as CSS variables (--shiki-light / --shiki-dark) that
 * globals.css switches between.
 */
export async function highlight(code: string, lang: CodeLanguage): Promise<string> {
  const instance = await getHighlighter();
  return fixContrast(
    instance.codeToHtml(code, {
      lang,
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    }),
  );
}
