import { hexToHsl, hslToHex } from "@/lib/color";
import type { ShaderMeta } from "./schema";

/**
 * Settings are the single source of truth shared by the live preview, the
 * customizer, shareable URLs and the code export.
 */
export type SettingValue = number | boolean | string[];
export type Settings = { colors: string[] } & Record<string, SettingValue>;

const HEX = /^#[0-9a-fA-F]{6}$/;

export function defaultSettings(meta: ShaderMeta): Settings {
  const settings: Settings = { colors: [...meta.colors.default] };
  for (const control of meta.controls) settings[control.key] = control.default;
  return settings;
}

function snap(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  const snapped = min + Math.round((clamped - min) / step) * step;
  // Trim floating-point noise such as 0.30000000000000004.
  return Math.min(max, Number(snapped.toFixed(6)));
}

/**
 * Builds valid settings from untrusted input (props, presets, query strings).
 * Unknown keys are dropped, numbers are clamped and snapped to the control's
 * range, and anything malformed falls back to the default.
 */
export function resolveSettings(meta: ShaderMeta, input?: Record<string, unknown>): Settings {
  const settings = defaultSettings(meta);
  if (!input) return settings;
  const colors = input.colors;
  if (Array.isArray(colors)) {
    settings.colors = settings.colors.map((fallback, index) => {
      const color: unknown = colors[index];
      return typeof color === "string" && HEX.test(color) ? color.toLowerCase() : fallback;
    });
  }
  for (const control of meta.controls) {
    const value = input[control.key];
    if (control.type === "float") {
      if (typeof value === "number" && Number.isFinite(value)) {
        settings[control.key] = snap(value, control.min, control.max, control.step);
      }
    } else if (typeof value === "boolean") {
      settings[control.key] = value;
    }
  }
  return settings;
}

export function applyPreset(meta: ShaderMeta, presetId: string): Settings {
  const preset = meta.presets.find((p) => p.id === presetId);
  if (!preset) return defaultSettings(meta);
  return resolveSettings(meta, { ...preset.values, colors: preset.colors });
}

function sameValue(a: SettingValue | undefined, b: SettingValue | undefined): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => item === b[index]);
  }
  return a === b;
}

/** The subset of `settings` that differs from the shader's defaults. */
export function changedSettings(meta: ShaderMeta, settings: Settings): Partial<Settings> {
  const defaults = defaultSettings(meta);
  const changed: Partial<Settings> = {};
  for (const key of Object.keys(defaults)) {
    if (!sameValue(settings[key], defaults[key])) changed[key] = settings[key];
  }
  return changed;
}

/** Compact, shareable form: `c=ff0000-00ff00&speed=1.5&grain=0`. Defaults are omitted. */
export function settingsToQuery(meta: ShaderMeta, settings: Settings): URLSearchParams {
  const params = new URLSearchParams();
  const changed = changedSettings(meta, settings);
  for (const [key, value] of Object.entries(changed)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) params.set("c", value.map((hex) => hex.slice(1)).join("-"));
    else if (typeof value === "boolean") params.set(key, value ? "1" : "0");
    else params.set(key, String(value));
  }
  return params;
}

type QueryInput = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(query: QueryInput, key: string): string | undefined {
  if (query instanceof URLSearchParams) return query.get(key) ?? undefined;
  const value = query[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Parses a query string through the same allowlist as `resolveSettings`. */
export function settingsFromQuery(meta: ShaderMeta, query: QueryInput): Settings {
  const input: Record<string, unknown> = {};
  const colors = readParam(query, "c");
  if (colors !== undefined && colors.length <= 64) {
    input.colors = colors.split("-").map((hex) => `#${hex}`);
  }
  for (const control of meta.controls) {
    const raw = readParam(query, control.key);
    if (raw === undefined || raw.length > 24) continue;
    if (control.type === "float") {
      if (/^-?\d+(\.\d+)?$/.test(raw)) input[control.key] = Number(raw);
    } else if (raw === "1" || raw === "0") {
      input[control.key] = raw === "1";
    }
  }
  return resolveSettings(meta, input);
}

/**
 * A fresh look that still belongs to the shader: every colour keeps its own
 * lightness and most of its saturation (so a dark sky stays dark) while the
 * whole palette turns around the colour wheel together, with a little
 * per-colour drift. Scale and intensity land in the middle half of their
 * ranges, the seed is anything, and the speed is left alone.
 * `random` returns numbers in [0, 1); pass a seeded one for repeatable results.
 */
export function randomizeSettings(
  meta: ShaderMeta,
  current: Settings,
  random: () => number = Math.random,
): Settings {
  const turn = random() * 360;
  const next: Record<string, unknown> = {
    ...current,
    colors: meta.colors.default.map((hex) => {
      const hsl = hexToHsl(hex);
      return hslToHex({
        h: hsl.h + turn + (random() - 0.5) * 40,
        s: hsl.s * (0.8 + random() * 0.2),
        l: hsl.l,
      });
    }),
  };
  for (const control of meta.controls) {
    if (control.type !== "float" || control.key === "speed") continue;
    if (control.key === "seed") {
      next.seed = control.min + random() * (control.max - control.min);
    } else if (control.key === "scale" || control.key === "intensity") {
      const span = control.max - control.min;
      next[control.key] = control.min + span * (0.25 + random() * 0.5);
    }
  }
  return resolveSettings(meta, next);
}
