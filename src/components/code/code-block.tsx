import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { CopyButton } from "@/components/ui/copy-button";

type DocLanguage = "tsx" | "html" | "bash" | "javascript";

let highlighter: Promise<HighlighterCore> | null = null;

/** Build-time highlighter for documentation pages. Nothing from it reaches the browser. */
function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= createHighlighterCore({
    themes: [import("shiki/themes/github-light.mjs"), import("shiki/themes/github-dark.mjs")],
    langs: [
      import("shiki/langs/tsx.mjs"),
      import("shiki/langs/html.mjs"),
      import("shiki/langs/bash.mjs"),
      import("shiki/langs/javascript.mjs"),
    ],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter;
}

/**
 * Highlighting is a pure function of its input, so it is cached. That also
 * keeps the timing calls inside the highlighter out of the prerender.
 */
async function highlightDoc(code: string, lang: DocLanguage): Promise<string> {
  "use cache";
  const instance = await getHighlighter();
  return instance.codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
}

interface CodeBlockProps {
  code: string;
  lang: DocLanguage;
  /** File name or short caption shown above the code. */
  title?: string;
}

/** A highlighted, copyable code sample, rendered on the server. */
export async function CodeBlock({ code, lang, title }: CodeBlockProps) {
  const html = await highlightDoc(code, lang);
  return (
    <figure className="border-line bg-bg-sunken rounded-card max-w-full min-w-0 overflow-hidden border">
      <figcaption className="border-line flex items-center justify-between gap-3 border-b py-1.5 pr-1.5 pl-4">
        <span className="text-text-muted truncate font-mono text-xs">{title ?? lang}</span>
        <CopyButton
          text={code}
          label="Copy"
          ariaLabel={`Copy ${title ?? "code"}`}
          variant="quiet"
          size="sm"
        />
      </figcaption>
      {/* Shiki escapes the source; the input is a string written in this repository. */}
      <div
        tabIndex={0}
        className="code-surface overflow-x-auto font-mono text-[13px] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </figure>
  );
}
