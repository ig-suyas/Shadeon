/**
 * Shader categories. Kept in its own module, free of Zod, so client code can
 * use the list without pulling the validation library into the browser.
 */
export const CATEGORIES = [
  "gradient",
  "aurora",
  "liquid",
  "glass",
  "grain",
  "halftone",
  "waves",
  "lines",
  "particles",
  "plasma",
  "fractal",
  "interactive",
  "fog",
  "fluid",
  "space",
] as const;

export type ShaderCategory = (typeof CATEGORIES)[number];
