"use client";

import { CodeIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CodePanel } from "@/components/code/code-panel";
import { CopyCodeButton } from "@/components/shader/copy-code-button";
import { button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { ShaderCanvas } from "@/engine/ShaderCanvas";
import type { ExportTarget } from "@/export/targets";
import type { ShaderMeta } from "@/shaders/schema";
import {
  applyPreset,
  changedSettings,
  randomizeSettings,
  resolveSettings,
  settingsFromQuery,
  settingsToQuery,
  type Settings,
} from "@/shaders/settings";
import { Customizer } from "./customizer";

const subscribeNever = (): (() => void) => () => {};
const readQuery = (): string => window.location.search;
const emptyQuery = (): string => "";

/** Lags behind fast changes (slider drags) so expensive work runs once they settle. */
function useSettled<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

function sameSettings(a: Settings, b: Settings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The interactive part of a shader page: live preview, every control, and the
 * code for exactly what is on screen. Settings are mirrored into the URL so a
 * tuned shader can be shared as a link.
 */
export function Workbench({ shader }: { shader: ShaderMeta }) {
  // "" on the server and while hydrating, then the real query string: settings
  // from a shared link apply right after hydration, with no mismatch.
  const query = useSyncExternalStore(subscribeNever, readQuery, emptyQuery);
  const fromLink = useMemo(
    () => settingsFromQuery(shader, new URLSearchParams(query)),
    [shader, query],
  );
  const [edited, setEdited] = useState<Settings | null>(null);
  const [target, setTarget] = useState<ExportTarget>("react");
  const settings = edited ?? fromLink;
  const codeSettings = useSettled(settings, 160);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirror edits into the address bar, without adding history entries.
  useEffect(() => {
    if (!edited) return;
    pending.current = setTimeout(() => {
      const next = settingsToQuery(shader, edited).toString();
      history.replaceState(null, "", `${location.pathname}${next ? `?${next}` : ""}`);
    }, 250);
    return () => {
      if (pending.current) clearTimeout(pending.current);
    };
  }, [shader, edited]);

  const change = useCallback(
    (patch: Record<string, unknown>) => {
      setEdited((current) => resolveSettings(shader, { ...(current ?? fromLink), ...patch }));
    },
    [shader, fromLink],
  );

  const activePreset = useMemo(
    () =>
      shader.presets.find((preset) => sameSettings(applyPreset(shader, preset.id), settings))?.id ??
      null,
    [shader, settings],
  );
  const isDefault = Object.keys(changedSettings(shader, settings)).length === 0;

  const shareUrl = (): string => {
    const next = settingsToQuery(shader, settings).toString();
    return `${location.origin}${location.pathname}${next ? `?${next}` : ""}`;
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        {/* Stays in view while the controls scroll, so every change is visible. */}
        <div
          data-testid="detail-preview"
          className="bg-bg sticky top-(--header-height) z-10 -mx-(--gutter) flex flex-col gap-3 self-start px-(--gutter) py-3 lg:top-[calc(var(--header-height)+1.5rem)] lg:mx-0 lg:px-0 lg:py-0"
        >
          <ShaderCanvas
            shader={shader}
            settings={settings}
            mode="dedicated"
            className="border-line rounded-card h-[min(36dvh,56vw)] w-full border lg:aspect-[16/10] lg:h-auto"
          />
          {/* The Code button sits directly under the shader at every screen size. */}
          <div className="flex flex-wrap items-center gap-2">
            <a href="#code" data-testid="detail-code" className={button("solid", "sm")}>
              <CodeIcon size={16} aria-hidden="true" />
              Code
            </a>
            <CopyCodeButton
              shader={shader}
              settings={settings}
              label="Copy React"
              variant="outline"
              size="sm"
            />
            <CopyButton text={shareUrl} label="Copy link" variant="quiet" size="sm" compact />
          </div>
        </div>

        <Customizer
          shader={shader}
          settings={settings}
          activePreset={activePreset}
          isDefault={isDefault}
          onChange={change}
          onPreset={(presetId) => setEdited(applyPreset(shader, presetId))}
          onRandomize={() => setEdited(randomizeSettings(shader, settings))}
          onReset={() => setEdited(resolveSettings(shader))}
        />
      </div>

      <section id="code" aria-labelledby="code-title" className="mt-14 scroll-mt-4">
        <h2 id="code-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
          Code
        </h2>
        <p className="text-text-muted mt-2 max-w-[60ch] leading-relaxed">
          This is the code for the shader exactly as it is set above. It updates as you change the
          controls.
        </p>
        <CodePanel
          shader={shader}
          settings={codeSettings}
          target={target}
          onTargetChange={setTarget}
          className="border-line bg-bg-raised rounded-card mt-5 h-[min(620px,75dvh)] overflow-hidden border"
        />
      </section>
    </>
  );
}
