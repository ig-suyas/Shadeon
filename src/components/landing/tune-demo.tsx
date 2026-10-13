"use client";

import { useId, useMemo, useState } from "react";
import { CopyCodeButton } from "@/components/shader/copy-code-button";
import { ShaderCanvas } from "@/engine/ShaderCanvas";
import { componentName } from "@/export/naming";
import { cn } from "@/lib/cn";
import type { ShaderMeta } from "@/shaders/schema";
import { applyPreset, changedSettings, resolveSettings } from "@/shaders/settings";

/** The JSX a developer would write for these settings: only props that differ from the defaults. */
function usageSnippet(shader: ShaderMeta, settings: ReturnType<typeof resolveSettings>): string {
  const changed = changedSettings(shader, settings);
  const props = Object.entries(changed).map(([key, value]) =>
    Array.isArray(value)
      ? `  ${key}={[${value.map((item) => `"${item}"`).join(", ")}]}`
      : `  ${key}={${String(value)}}`,
  );
  return [`<${componentName(shader.id)}`, '  className="absolute inset-0"', ...props, "/>"].join(
    "\n",
  );
}

const chip =
  "rounded-control border px-3 py-1.5 text-sm transition-colors duration-150 " +
  "border-line text-text-muted hover:text-text aria-pressed:border-text aria-pressed:text-text";

/**
 * A working miniature of the product: choose a shader, pick a preset, change
 * the speed, and copy the component. The preview is the real shader.
 */
export function TuneDemo({ shaders }: { shaders: ShaderMeta[] }) {
  const speedId = useId();
  const [shaderId, setShaderId] = useState(shaders[0]?.id ?? "");
  const shader = shaders.find((item) => item.id === shaderId) ?? shaders[0];
  const [presetId, setPresetId] = useState<Record<string, string>>({});
  const [speed, setSpeed] = useState<Record<string, number>>({});

  const settings = useMemo(() => {
    if (!shader) return null;
    const preset = presetId[shader.id] ?? shader.presets[0]?.id ?? "";
    const base = applyPreset(shader, preset);
    const override = speed[shader.id];
    return override === undefined ? base : resolveSettings(shader, { ...base, speed: override });
  }, [shader, presetId, speed]);

  if (!shader || !settings) return null;
  const speedControl = shader.controls.find((control) => control.key === "speed");
  const activePreset = presetId[shader.id] ?? shader.presets[0]?.id;

  return (
    <div className="border-line bg-bg-raised rounded-card overflow-hidden border">
      <div
        role="group"
        aria-label="Shader"
        className="border-line scroll-quiet flex gap-2 overflow-x-auto border-b p-3"
      >
        {shaders.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === shader.id}
            onClick={() => setShaderId(item.id)}
            className={cn(chip, "shrink-0")}
          >
            {item.name}
          </button>
        ))}
      </div>

      <ShaderCanvas shader={shader} settings={settings} className="aspect-video w-full" />

      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <div role="group" aria-label="Preset" className="flex flex-wrap gap-2">
          {shader.presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={preset.id === activePreset}
              onClick={() => setPresetId((current) => ({ ...current, [shader.id]: preset.id }))}
              className={chip}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {speedControl?.type === "float" ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={speedId} className="flex items-baseline justify-between text-sm">
              <span>Speed</span>
              <span className="text-text-muted font-mono text-xs tabular-nums">
                {Number(settings.speed).toFixed(2)}
              </span>
            </label>
            <input
              id={speedId}
              type="range"
              min={speedControl.min}
              max={speedControl.max}
              step={speedControl.step}
              value={Number(settings.speed)}
              onChange={(event) =>
                setSpeed((current) => ({ ...current, [shader.id]: Number(event.target.value) }))
              }
              className="w-full accent-(--text)"
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <pre
            aria-label="Usage"
            tabIndex={0}
            className="border-line bg-bg-sunken text-text-muted rounded-control overflow-x-auto border p-3 font-mono text-[13px] leading-relaxed"
          >
            <code>{usageSnippet(shader, settings)}</code>
          </pre>
          <CopyCodeButton
            shader={shader}
            settings={settings}
            label="Copy component"
            variant="solid"
            size="sm"
            className="self-start"
          />
        </div>
      </div>
    </div>
  );
}
