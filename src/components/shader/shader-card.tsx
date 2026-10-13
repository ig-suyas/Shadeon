import { CodeIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { button } from "@/components/ui/button";
import { ShaderCanvas } from "@/engine/ShaderCanvas";
import { cn } from "@/lib/cn";
import type { ShaderMeta } from "@/shaders/schema";

/** Where a shader opens, and where its code panel opens. One place so links never drift. */
export function shaderHref(id: string, code = false): string {
  return code ? `/shaders?s=${id}&code=react` : `/shaders?s=${id}`;
}

interface ShaderCardProps {
  shader: ShaderMeta;
  className?: string;
  /** Classes for the live surface, for example an aspect ratio or flex-1. */
  surfaceClassName?: string;
}

/**
 * A live shader with its name and a Code button directly beneath it. The Code
 * button is always visible: it never depends on hover.
 */
export function ShaderCard({ shader, className, surfaceClassName }: ShaderCardProps) {
  return (
    <article
      className={cn(
        "border-line bg-bg-raised rounded-card flex flex-col overflow-hidden border",
        className,
      )}
    >
      <Link
        href={shaderHref(shader.id)}
        aria-label={`Open ${shader.name}`}
        className="relative flex min-h-0 flex-1 focus-visible:-outline-offset-2"
      >
        <ShaderCanvas shader={shader} className={cn("w-full flex-1", surfaceClassName)} />
      </Link>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-medium">{shader.name}</h3>
          <p className="text-text-faint font-mono text-xs">{shader.category}</p>
        </div>
        <Link
          href={shaderHref(shader.id, true)}
          aria-label={`Get the code for ${shader.name}`}
          className={button("outline", "sm")}
        >
          <CodeIcon size={16} aria-hidden="true" />
          Code
        </Link>
      </div>
    </article>
  );
}
