import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageShellProps {
  title: string;
  lead?: ReactNode;
  children: ReactNode;
  /** Narrow keeps long-form text at a readable measure. */
  width?: "narrow" | "wide";
  className?: string;
}

/** The frame for every content page: one h1, an optional lead paragraph, then the content. */
export function PageShell({ title, lead, children, width = "narrow", className }: PageShellProps) {
  return (
    <main id="main" className="shell flex-1 pt-[calc(var(--header-height)+3rem)] pb-24">
      <div className={cn(width === "narrow" ? "max-w-[720px]" : "", className)}>
        <h1 className="text-4xl font-semibold tracking-tighter text-balance md:text-5xl">
          {title}
        </h1>
        {lead ? (
          <p className="text-text-muted mt-4 max-w-[60ch] text-lg leading-relaxed">{lead}</p>
        ) : null}
        <div className="mt-10">{children}</div>
      </div>
    </main>
  );
}

/** Long-form text: headings, paragraphs, lists and links with consistent rhythm. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "text-text-muted flex min-w-0 flex-col gap-4 leading-relaxed",
        "[&_a]:text-text [&_a]:underline [&_a]:underline-offset-4",
        "[&_h2]:text-text [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight",
        "[&_h3]:text-text [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-medium",
        "[&_li]:pl-1 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-6",
        "[&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6",
        "[&_strong]:text-text [&_strong]:font-medium",
        "[&_:not(pre)>code]:text-text [&_:not(pre)>code]:bg-bg-sunken [&_:not(pre)>code]:rounded-[4px] [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.9em]",
        className,
      )}
    >
      {children}
    </div>
  );
}
