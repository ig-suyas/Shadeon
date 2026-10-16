"use client";

import { useMemo, useSyncExternalStore } from "react";
import { ShaderCanvas } from "@/engine/ShaderCanvas";
import { getShader } from "@/shaders/registry";
import { applyPreset } from "@/shaders/settings";

const subscribeNever = (): (() => void) => () => {};
const readQuery = (): string => window.location.search;
const noQuery = (): string => "";

export function StudioStage() {
  const query = useSyncExternalStore(subscribeNever, readQuery, noQuery);
  const params = useMemo(() => new URLSearchParams(query), [query]);
  const shader = getShader(params.get("id") ?? "lodestone");
  const preset = params.get("preset");
  const settings = useMemo(
    () => (shader && preset ? applyPreset(shader, preset) : undefined),
    [shader, preset],
  );
  if (!query || !shader) return null;
  return (
    <main className="fixed inset-0" data-testid="studio-stage">
      <style>{"header, footer { display: none; }"}</style>
      <ShaderCanvas
        shader={shader}
        settings={settings}
        mode={params.get("mode") === "shared" ? "shared" : "dedicated"}
        className="h-full w-full"
      />
    </main>
  );
}
