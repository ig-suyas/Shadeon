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

/** The page of one shader, where it can be customized. */
export function detailHref(id: string, query = ""): string {
  return `/shaders/${id}${query ? `?${query}` : ""}`;
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
  /** Link to the shader page instead of opening the gallery viewer. */
  detail?: boolean;
  /** Heading level of the name: one below the section the card sits in. */
  headingLevel?: 2 | 3;
}

/**
 * A live shader with its name and a Code button directly beneath it. The Code
 * button is always visible: it never depends on hover, so it works on touch.
 */
export function ShaderCard({
  shader,
  className,
  surfaceClassName,
  onOpen,
  detail = false,
  headingLevel = 3,
}: ShaderCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
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
        href={detail ? detailHref(shader.id) : shaderHref(shader.id)}
        onClick={intercept(false)}
        aria-label={`Open ${shader.name}`}
        className="relative flex min-h-0 flex-1 focus-visible:-outline-offset-2"
      >
        <ShaderCanvas shader={shader} className={cn("w-full flex-1", surfaceClassName)} />
      </Link>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <Heading className="truncate text-[15px] font-medium">{shader.name}</Heading>
          <p className="text-text-faint font-mono text-xs">{shader.category}</p>
        </div>
        <Link
          href={detail ? `${detailHref(shader.id)}#code` : shaderHref(shader.id, true)}
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
