"use client";

import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { button } from "@/components/ui/button";
import type { ExportTarget } from "@/export/targets";
import { cn } from "@/lib/cn";
import type { ShaderMeta } from "@/shaders/schema";
import {
  availableCategories,
  filterShaders,
  hasActiveFilters,
  parseGalleryParams,
  serializeGalleryState,
  SORT_LABELS,
  SORTS,
  tagCounts,
  type GalleryState,
  type Sort,
} from "./filters";
import { GalleryGrid } from "./gallery-grid";
import { ShaderViewer } from "./shader-viewer";

const chip =
  "rounded-control shrink-0 border px-3 py-1.5 text-sm transition-colors duration-150 " +
  "border-line text-text-muted hover:text-text aria-pressed:border-text aria-pressed:text-text";

// True while the open viewer was reached by a push from this page, so closing can go back.
let pushedOpen = false;

function getOrigin(id: string): Element | null {
  return document.querySelector(`[data-card="${CSS.escape(id)}"]`);
}

/**
 * The gallery: search, category and tag filters, sorting, the live grid, and
 * the expanded viewer. All of it is driven by the URL.
 */
export function Gallery({ shaders }: { shaders: readonly ShaderMeta[] }) {
  const searchId = useId();
  const sortId = useId();
  const params = useSearchParams();
  const state = useMemo(() => parseGalleryParams(params), [params]);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visible = useMemo(() => filterShaders(shaders, state), [shaders, state]);
  const categories = useMemo(() => availableCategories(shaders), [shaders]);
  const tags = useMemo(() => tagCounts(shaders).slice(0, 14), [shaders]);
  const open = state.open ? (shaders.find((shader) => shader.id === state.open) ?? null) : null;

  const navigate = useCallback(
    (patch: Partial<GalleryState>, mode: "push" | "replace" = "replace"): void => {
      const next = serializeGalleryState({
        ...parseGalleryParams(new URLSearchParams(location.search)),
        ...patch,
      });
      const url = `${location.pathname}${next}`;
      if (mode === "push") history.pushState(null, "", url);
      else history.replaceState(null, "", url);
    },
    [],
  );

  // Keep the search box in step with the URL (back button, cleared filters)
  // without fighting the user while they type.
  useEffect(() => {
    const input = searchRef.current;
    if (input && document.activeElement !== input && input.value !== state.q) input.value = state.q;
  }, [state.q]);

  // A viewer closed by the browser Back button has already consumed its history entry.
  useEffect(() => {
    if (!state.open) pushedOpen = false;
  }, [state.open]);

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
    },
    [],
  );

  const onSearch = (value: string): void => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => navigate({ q: value }), 180);
  };

  const clearFilters = (): void => {
    if (searchRef.current) searchRef.current.value = "";
    navigate({ q: "", category: null, tags: [] });
  };

  const openShader = useCallback(
    (id: string, withCode: boolean): void => {
      pushedOpen = true;
      navigate({ open: id, code: withCode ? "react" : null }, "push");
    },
    [navigate],
  );

  const closeShader = useCallback((): void => {
    if (pushedOpen) {
      pushedOpen = false;
      history.back();
    } else {
      navigate({ open: null, code: null });
    }
  }, [navigate]);

  const setCode = useCallback((code: ExportTarget | null): void => navigate({ code }), [navigate]);

  const index = open ? visible.findIndex((shader) => shader.id === open.id) : -1;
  const step =
    index !== -1 && visible.length > 1
      ? (direction: -1 | 1): void => {
          const next = visible[(index + direction + visible.length) % visible.length];
          if (next) navigate({ open: next.id });
        }
      : undefined;

  const toggleTag = (tag: string): void => {
    navigate({
      tags: state.tags.includes(tag)
        ? state.tags.filter((item) => item !== tag)
        : [...state.tags, tag],
    });
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <label htmlFor={searchId} className="sr-only">
              Search shaders
            </label>
            <MagnifyingGlassIcon
              size={18}
              aria-hidden="true"
              className="text-text-faint pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
            />
            <input
              ref={searchRef}
              id={searchId}
              type="search"
              defaultValue={state.q}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search by name, tag or category"
              maxLength={60}
              autoComplete="off"
              spellCheck={false}
              className="border-line bg-bg-raised placeholder:text-text-faint hover:border-line-strong rounded-control h-11 w-full border pr-4 pl-10 text-[15px] transition-colors duration-150 [&::-webkit-search-cancel-button]:appearance-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor={sortId} className="text-text-muted text-sm">
              Sort
            </label>
            <select
              id={sortId}
              value={state.sort}
              onChange={(event) => navigate({ sort: event.target.value as Sort })}
              className="border-line bg-bg-raised hover:border-line-strong rounded-control h-11 border px-3 text-sm transition-colors duration-150"
            >
              {SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          role="group"
          aria-label="Category"
          className="scroll-quiet -mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter)"
        >
          <button
            type="button"
            aria-pressed={state.category === null}
            onClick={() => navigate({ category: null })}
            className={chip}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={state.category === category}
              onClick={() => navigate({ category: state.category === category ? null : category })}
              className={cn(chip, "capitalize")}
            >
              {category}
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label="Tags"
          className="scroll-quiet -mx-(--gutter) flex gap-1.5 overflow-x-auto px-(--gutter)"
        >
          {tags.map(({ tag }) => (
            <button
              key={tag}
              type="button"
              aria-pressed={state.tags.includes(tag)}
              onClick={() => toggleTag(tag)}
              className="text-text-faint hover:text-text aria-pressed:bg-solid aria-pressed:text-solid-text rounded-control shrink-0 px-2 py-1 font-mono text-xs transition-colors duration-150"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p role="status" className="text-text-muted font-mono text-xs" data-testid="result-count">
          {visible.length} of {shaders.length} {shaders.length === 1 ? "shader" : "shaders"}
        </p>
        {hasActiveFilters(state) ? (
          <button type="button" onClick={clearFilters} className={button("quiet", "sm", "-mr-3.5")}>
            <XIcon size={14} aria-hidden="true" />
            Clear filters
          </button>
        ) : null}
      </div>

      {visible.length > 0 ? (
        <GalleryGrid shaders={visible} onOpen={openShader} />
      ) : (
        <div className="border-line rounded-card mt-4 flex flex-col items-start gap-4 border border-dashed px-6 py-14">
          <h2 className="text-xl font-medium">No shaders match those filters.</h2>
          <p className="text-text-muted max-w-[52ch] leading-relaxed">
            Try a shorter search or remove a tag. If the look you want is missing, you can ask for
            it.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={clearFilters} className={button("solid", "sm")}>
              Clear filters
            </button>
            <Link href="/request" className={button("outline", "sm")}>
              Request a shader
            </Link>
          </div>
        </div>
      )}

      {open ? (
        <ShaderViewer
          shader={open}
          code={state.code}
          getOrigin={getOrigin}
          onClose={closeShader}
          onCodeChange={setCode}
          onStep={step}
        />
      ) : null}
    </>
  );
}
