"use client";

import { ArrowCounterClockwiseIcon, ShuffleIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { button } from "@/components/ui/button";
import { isHex } from "@/lib/color";
import { useTheme } from "@/lib/use-theme";
import type { ShaderControl, ShaderMeta } from "@/shaders/schema";
import type { Settings } from "@/shaders/settings";
import { effectiveColors } from "@/studio/palette";

interface CustomizerProps {
  shader: ShaderMeta;
  settings: Settings;
  /** Id of the preset whose values match the current settings, if any. */
  activePreset: string | null;
  isDefault: boolean;
  onChange: (patch: Record<string, unknown>) => void;
  onPreset: (presetId: string) => void;
  onRandomize: () => void;
  onReset: () => void;
}

const field =
  "border-line bg-bg hover:border-line-strong rounded-control h-9 border px-2.5 font-mono text-[13px] transition-colors duration-150";

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const id = useId();
  // While the text box has focus it shows what is being typed, valid or not.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;
  const invalid = draft !== null && !isHex(draft);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="truncate text-sm">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} colour picker`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="border-line-strong rounded-control size-9 shrink-0 cursor-pointer border bg-transparent p-0.5 [&::-moz-color-swatch]:rounded-[3px] [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-[3px] [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <input
          id={id}
          type="text"
          inputMode="text"
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          value={shown}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onFocus={() => setDraft(value)}
          onBlur={() => setDraft(null)}
          onChange={(event) => {
            const next = event.target.value.trim();
            setDraft(next);
            if (isHex(next)) onChange(next.toLowerCase());
          }}
          className={`${field} aria-invalid:border-danger w-full min-w-0`}
        />
      </div>
      {invalid ? (
        <p id={`${id}-error`} className="text-danger text-xs">
          Use a hex colour like #1a2b3c.
        </p>
      ) : null}
    </div>
  );
}

function decimals(step: number): number {
  const text = String(step);
  return text.includes(".") ? (text.split(".")[1]?.length ?? 0) : 0;
}

function ControlField({
  control,
  value,
  onChange,
}: {
  control: ShaderControl;
  value: number | boolean;
  onChange: (value: number | boolean) => void;
}) {
  const id = useId();
  if (control.type === "bool") {
    return (
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-sm">
          {control.label}
        </label>
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 accent-(--text)"
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm">
          {control.label}
        </label>
        <output htmlFor={id} className="text-text-muted font-mono text-xs tabular-nums">
          {Number(value).toFixed(decimals(control.step))}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={Number(value)}
        aria-describedby={control.description ? `${id}-help` : undefined}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-5 w-full accent-(--text)"
      />
      {control.description ? (
        <p id={`${id}-help`} className="text-text-faint text-xs leading-relaxed">
          {control.description}
        </p>
      ) : null}
    </div>
  );
}

/** Every control a shader exposes: presets, colours, sliders and switches. */
export function Customizer({
  shader,
  settings,
  activePreset,
  isDefault,
  onChange,
  onPreset,
  onRandomize,
  onReset,
}: CustomizerProps) {
  // Studio shaders have a palette per theme: show the one on screen.
  const theme = useTheme();
  const shownColors = effectiveColors(shader, settings.colors, theme);
  return (
    <div className="border-line bg-bg-raised rounded-card flex flex-col border">
      <div className="border-line flex items-center justify-between gap-2 border-b py-2 pr-2 pl-4">
        <h2 className="text-base font-medium">Customize</h2>
        <div className="flex">
          <button type="button" onClick={onRandomize} className={button("quiet", "sm")}>
            <ShuffleIcon size={16} aria-hidden="true" />
            Randomize
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={isDefault}
            className={button("quiet", "sm")}
          >
            <ArrowCounterClockwiseIcon size={16} aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-4">
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-sm font-medium">Presets</legend>
          <div className="flex flex-wrap gap-2">
            {shader.presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={preset.id === activePreset}
                onClick={() => onPreset(preset.id)}
                className="border-line text-text-muted hover:text-text aria-pressed:border-text aria-pressed:text-text rounded-control border px-3 py-1.5 text-sm transition-colors duration-150"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2.5 text-sm font-medium">Colours</legend>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {shownColors.map((color, index) => (
              <ColorField
                key={index}
                label={shader.colors.labels[index] ?? `Colour ${index + 1}`}
                value={color}
                onChange={(hex) =>
                  onChange({
                    colors: shownColors.map((item, i) => (i === index ? hex : item)),
                  })
                }
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2.5 text-sm font-medium">Motion and shape</legend>
          <div className="flex flex-col gap-5">
            {shader.controls.map((control) => (
              <ControlField
                key={control.key}
                control={control}
                value={settings[control.key] as number | boolean}
                onChange={(value) => onChange({ [control.key]: value })}
              />
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
