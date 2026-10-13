import type { ShaderControl } from "./schema";

type FloatControl = Extract<ShaderControl, { type: "float" }>;
type Range = Pick<FloatControl, "default" | "min" | "max"> &
  Partial<Pick<FloatControl, "step" | "label" | "description">>;

/** Builders for the controls every shader has, so each meta file only states what is specific to it. */

export function speed(defaultValue = 1): FloatControl {
  return {
    key: "speed",
    type: "float",
    label: "Speed",
    default: defaultValue,
    min: 0,
    max: 3,
    step: 0.05,
  };
}

export function seed(defaultValue: number): FloatControl {
  return {
    key: "seed",
    type: "float",
    label: "Seed",
    default: defaultValue,
    min: 0,
    max: 999,
    step: 1,
  };
}

export function scale(range: Range): FloatControl {
  return { key: "scale", type: "float", label: "Scale", step: 0.05, ...range };
}

export function intensity(range: Range): FloatControl {
  return { key: "intensity", type: "float", label: "Intensity", step: 0.05, ...range };
}

/** A shader-specific slider. */
export function slider(key: string, label: string, range: Range): FloatControl {
  return { key, type: "float", step: 0.05, ...range, label };
}
