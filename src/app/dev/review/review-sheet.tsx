"use client";

import { useSyncExternalStore } from "react";
import { ShaderCanvas } from "@/engine/ShaderCanvas";
import { shaders } from "@/shaders/registry";
import { applyPreset } from "@/shaders/settings";

const subscribeNever = (): (() => void) => () => {};
const readIds = (): string => new URLSearchParams(window.location.search).get("ids") ?? "";
const noIds = (): string => "";

export function ReviewSheet() {
  const ids = useSyncExternalStore(subscribeNever, readIds, noIds);
  const wanted = ids ? ids.split(",") : null;
  const rows = wanted ? shaders.filter((shader) => wanted.includes(shader.id)) : shaders;

  return (
    <main className="flex flex-col gap-6 px-4 py-6" data-testid="review-sheet">
      {/* The sheet is photographed whole; the site chrome would only cover tiles. */}
      <style>{"header, footer { display: none; }"}</style>
      {rows.map((shader) => (
        <section key={shader.id} className="flex flex-col gap-2">
          <h2 className="font-mono text-sm">
            {shader.id} <span className="text-text-faint">cost {shader.cost}</span>
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {shader.presets.slice(0, 4).map((preset) => (
              <figure key={preset.id} className="flex flex-col gap-1">
                <ShaderCanvas
                  shader={shader}
                  settings={applyPreset(shader, preset.id)}
                  className="aspect-video w-full"
                />
                <figcaption className="text-text-faint font-mono text-[11px]">
                  {preset.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
