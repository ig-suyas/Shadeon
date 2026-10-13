"use client";

import { useEffect, useMemo, useState } from "react";
import { dedicatedCount } from "@/engine/context-budget";
import { ShaderCanvas, type ShaderStatus } from "@/engine/ShaderCanvas";
import { sharedStats } from "@/engine/shared-context";
import { EXPORT_TARGETS, generateExport, type ExportTarget } from "@/export/generate";
import { loadFragment } from "@/shaders/loaders";
import { shaders } from "@/shaders/registry";
import { applyPreset, defaultSettings, type Settings } from "@/shaders/settings";

function vanillaDocument(code: string, id: string): string {
  return `<!doctype html><html><head><style>html,body{margin:0;height:100%;background:#000}</style></head><body><canvas id="${id}" style="display:block;width:100%;height:100%"></canvas><script type="module">${code}</script></body></html>`;
}

export function Playground() {
  const [shaderId, setShaderId] = useState(shaders[0]?.id ?? "");
  const shader = shaders.find((item) => item.id === shaderId) ?? shaders[0];
  const [overrides, setOverrides] = useState<Record<string, Settings>>({});
  const [fragments, setFragments] = useState<Record<string, string>>({});
  const [target, setTarget] = useState<ExportTarget>("react");
  const [status, setStatus] = useState<ShaderStatus>("poster");
  const [stats, setStats] = useState("");

  const settings = useMemo(
    () => (shader ? (overrides[shader.id] ?? defaultSettings(shader)) : null),
    [shader, overrides],
  );
  const fragment = shader ? fragments[shader.id] : undefined;

  useEffect(() => {
    let cancelled = false;
    void loadFragment(shaderId).then((source) => {
      if (!cancelled) setFragments((current) => ({ ...current, [shaderId]: source }));
    });
    return () => {
      cancelled = true;
    };
  }, [shaderId]);

  useEffect(() => {
    const timer = setInterval(() => {
      const shared = sharedStats();
      setStats(
        `shared slots ${shared.slots} · programs ${shared.programs} · quality ${shared.scale} · dedicated contexts ${dedicatedCount()}`,
      );
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const code = useMemo(
    () =>
      shader && fragment && settings
        ? generateExport({ meta: shader, fragment, settings }, target).code
        : "",
    [shader, fragment, settings, target],
  );
  const vanilla = useMemo(
    () =>
      shader && fragment && settings
        ? generateExport({ meta: shader, fragment, settings }, "vanilla").code
        : "",
    [shader, fragment, settings],
  );

  if (!shader || !settings) return null;

  const update = (key: string, value: number | boolean): void => {
    setOverrides((current) => ({ ...current, [shader.id]: { ...settings, [key]: value } }));
  };

  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Engine playground</h1>
        <p className="text-text-muted font-mono text-xs" data-testid="stats">
          {stats}
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-text-muted text-sm font-medium">
          1. Dedicated context: status <span data-testid="dedicated-status">{status}</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {shaders.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setShaderId(item.id)}
              aria-pressed={item.id === shader.id}
              className="border-line aria-pressed:border-accent rounded-control border px-3 py-1.5 text-sm"
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <ShaderCanvas
            shader={shader}
            settings={settings}
            mode="dedicated"
            onStatusChange={setStatus}
            className="rounded-card aspect-video w-full"
          />
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {shader.presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    setOverrides((current) => ({
                      ...current,
                      [shader.id]: applyPreset(shader, preset.id),
                    }))
                  }
                  className="border-line rounded-control border px-2.5 py-1 text-xs"
                >
                  {preset.name}
                </button>
              ))}
            </div>
            {shader.controls.map((control) =>
              control.type === "float" ? (
                <label key={control.key} className="flex flex-col gap-1 text-xs">
                  <span className="text-text-muted flex justify-between font-mono">
                    {control.label}
                    <span>{String(settings[control.key])}</span>
                  </span>
                  <input
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={Number(settings[control.key])}
                    onChange={(event) => update(control.key, Number(event.target.value))}
                  />
                </label>
              ) : (
                <label key={control.key} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={settings[control.key] === true}
                    onChange={(event) => update(control.key, event.target.checked)}
                  />
                  {control.label}
                </label>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-text-muted text-sm font-medium">
          2. Shared context: every card below draws through one WebGL context
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {shaders.flatMap((item) =>
            item.presets.map((preset) => (
              <figure key={`${item.id}:${preset.id}`} className="flex flex-col gap-1.5">
                <ShaderCanvas
                  shader={item}
                  settings={applyPreset(item, preset.id)}
                  className="rounded-card aspect-[4/3] w-full"
                />
                <figcaption className="text-text-faint font-mono text-[11px]">
                  {item.id} / {preset.id}
                </figcaption>
              </figure>
            )),
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-text-muted text-sm font-medium">
          3. Export check: the frame on the left runs the generated JavaScript as-is
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {vanilla ? (
            <iframe
              title="Generated vanilla JavaScript running in isolation"
              data-testid="vanilla-frame"
              sandbox="allow-scripts"
              srcDoc={vanillaDocument(vanilla, shader.id)}
              className="border-line rounded-card aspect-video w-full border"
            />
          ) : (
            <div className="border-line rounded-card aspect-video w-full border" />
          )}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              {EXPORT_TARGETS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTarget(item)}
                  aria-pressed={item === target}
                  className="border-line aria-pressed:border-accent rounded-control border px-2.5 py-1 text-xs"
                >
                  {item}
                </button>
              ))}
              <span className="text-text-faint ml-auto font-mono text-xs">
                {code.length.toLocaleString("en-US")} chars
              </span>
            </div>
            <pre
              data-testid="export-code"
              className="border-line bg-bg-sunken rounded-card h-80 overflow-auto border p-3 font-mono text-[11px] leading-relaxed"
            >
              {code}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}
