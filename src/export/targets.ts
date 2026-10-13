/** Export targets and their labels. Kept apart from the generator so UI code can import it cheaply. */
export const EXPORT_TARGETS = ["react", "vanilla", "glsl"] as const;
export type ExportTarget = (typeof EXPORT_TARGETS)[number];

export const TARGET_LABELS: Record<ExportTarget, string> = {
  react: "React TS",
  vanilla: "JavaScript",
  glsl: "GLSL",
};
