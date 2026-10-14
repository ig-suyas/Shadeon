"use client";

import { CaretDownIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo } from "react";
import { button } from "@/components/ui/button";
import type { ExportTarget } from "@/export/targets";
import type { ShaderMeta } from "@/shaders/schema";
import {
  availableCategories,
  filterShaders,
  hasActiveFilters,
  parseGalleryParams,
  serializeGalleryState,
  type GalleryState,
} from "./filters";
import { GalleryGrid } from "./gallery-grid";
import { ShaderViewer } from "./shader-viewer";

// True while the open viewer was reached by a push from this page, so closing can go back.
let pushedOpen = false;

function getOrigin(id: string): Element | null {
  return document.querySelector(`[data-card="${CSS.escape(id)}"]`);
}

/**
 * The gallery: one compact category filter, the live grid, and the expanded
 * viewer, all driven by the URL. The library is small, so there is no search
 * box or tag cloud (owner, 2026-10-14); old links with q, tag or sort still
 * filter, and "Clear filters" resets them.
 */
export function Gallery({ shaders }: { shaders: readonly ShaderMeta[] }) {
  const filterId = useId();
  const params = useSearchParams();
  const state = useMemo(() => parseGalleryParams(params), [params]);

  const visible = useMemo(() => filterShaders(shaders, state), [shaders, state]);
  const categories = useMemo(() => availableCategories(shaders), [shaders]);
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

  // A viewer closed by the browser Back button has already consumed its history entry.
  useEffect(() => {
    if (!state.open) pushedOpen = false;
  }, [state.open]);

  const clearFilters = (): void => navigate({ q: "", category: null, tags: [] });

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

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="text-text-muted text-sm" data-testid="result-count">
          {visible.length} of {shaders.length} {shaders.length === 1 ? "shader" : "shaders"}
        </p>
        <div className="flex items-center gap-2">
          {hasActiveFilters(state) ? (
            <button type="button" onClick={clearFilters} className={button("quiet", "sm")}>
              <XIcon size={14} aria-hidden="true" />
              Clear
            </button>
          ) : null}
          <label htmlFor={filterId} className="sr-only">
            Filter by category
          </label>
          <div className="relative">
            <select
              id={filterId}
              value={state.category ?? ""}
              onChange={(event) =>
                navigate({
                  category: categories.find((item) => item === event.target.value) ?? null,
                })
              }
              className="border-line-strong bg-bg-raised text-text hover:border-text rounded-pill h-9 appearance-none border pr-9 pl-4 text-sm capitalize transition-colors duration-(--duration-fast)"
            >
              <option value="">All shaders</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <CaretDownIcon
              size={14}
              aria-hidden="true"
              className="text-text-muted pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
            />
          </div>
        </div>
      </div>

      {visible.length > 0 ? (
        <GalleryGrid shaders={visible} onOpen={openShader} />
      ) : (
        <div className="border-line rounded-card mt-4 flex flex-col items-start gap-4 border border-dashed px-6 py-14">
          <h2 className="text-xl font-medium">No shaders match those filters.</h2>
          <p className="text-text-muted max-w-[52ch] leading-relaxed">
            Try another category. If the look you want is missing, you can ask for it.
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
