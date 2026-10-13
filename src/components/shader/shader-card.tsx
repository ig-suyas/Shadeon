"use client";

import { CodeIcon } from "@phosphor-icons/react";
import Link from "next/link";
import type { MouseEvent } from "react";
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
  /**
   * When set (in the gallery), plain clicks open the shader in place instead of
   * navigating. Modified clicks (new tab, etc.) still follow the link.
   */
  onOpen?: (id: string, withCode: boolean) => void;
}

/**
 * A live shader with its name and a Code button directly beneath it. The Code
 * button is always visible: it never depends on hover, so it works on touch.
 */
export function ShaderCard({ shader, className, surfaceClassName, onOpen }: ShaderCardProps) {
  const intercept =
    (withCode: boolean) =>
    (event: MouseEvent<HTMLAnchorElement>): void => {
      if (!onOpen || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      onOpen(shader.id, withCode);
    };

  return (
    <article
      data-card={shader.id}
      className={cn(
        "border-line bg-bg-raised rounded-card hover:border-line-strong flex flex-col overflow-hidden border transition-colors duration-150",
        className,
      )}
    >
      <Link
        href={shaderHref(shader.id)}
        onClick={intercept(false)}
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
          onClick={intercept(true)}
          aria-label={`Get the code for ${shader.name}`}
          data-testid="card-code"
          className={button("outline", "sm")}
        >
          <CodeIcon size={16} aria-hidden="true" />
          Code
        </Link>
      </div>
    </article>
  );
}
