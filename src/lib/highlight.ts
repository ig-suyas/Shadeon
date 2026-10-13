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
 * Returns highlighted HTML. Shiki escapes the source, and both colour themes
 * are emitted as CSS variables (--shiki-light / --shiki-dark) that
 * globals.css switches between.
 */
export async function highlight(code: string, lang: CodeLanguage): Promise<string> {
  const instance = await getHighlighter();
  return instance.codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
}
