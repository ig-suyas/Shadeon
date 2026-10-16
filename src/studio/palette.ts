import type { ShaderMeta } from "@/shaders/schema";
import type { StudioRange } from "./core";

/**
 * Studio shaders ship a palette per theme. A visitor who has not changed the
 * colours sees the palette made for the current theme; once they pick
 * colours, those apply in both themes.
 */
export function effectiveColors(
  meta: ShaderMeta,
  colors: readonly string[],
  theme: "light" | "dark",
): string[] {
  const light = meta.colors.light;
  const untouched =
    colors.length === meta.colors.default.length &&
    colors.every((hex, index) => hex.toLowerCase() === meta.colors.default[index]?.toLowerCase());
  return theme === "light" && light && untouched ? [...light] : [...colors];
}

/** Control ranges in the form the studio core clamps against. */
export function studioRanges(meta: ShaderMeta): Record<string, StudioRange> {
  const ranges: Record<string, StudioRange> = {};
  for (const control of meta.controls) {
    ranges[control.key] =
      control.type === "float"
        ? { min: control.min, max: control.max, default: control.default }
        : { default: control.default };
  }
  return ranges;
}
