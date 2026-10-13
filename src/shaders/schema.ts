import { z } from "zod";

/**
 * Shader metadata schema. Shader `meta.ts` files are typed with `ShaderMeta`
 * and checked against this schema in tests and build scripts, so Zod never
 * ships in the browser bundle for the catalog.
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
] as const;

/** Every shader exposes these controls, each with its own range and default. */
export const STANDARD_KEYS = ["speed", "scale", "intensity", "seed"] as const;

/** Keys the runtime or the React wrapper already use. */
export const RESERVED_KEYS = [
  "colors",
  "time",
  "resolution",
  "pointer",
  "scroll",
  "paused",
  "maxDpr",
  "className",
  "style",
] as const;

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "expected #rrggbb");

const keySchema = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]*$/, "expected camelCase")
  .refine((key) => !(RESERVED_KEYS as readonly string[]).includes(key), "reserved key");

const floatControlSchema = z
  .object({
    key: keySchema,
    type: z.literal("float"),
    label: z.string().min(1),
    description: z.string().min(1).optional(),
    default: z.number(),
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
  })
  .refine((c) => c.min < c.max && c.default >= c.min && c.default <= c.max, {
    message: "default must be inside [min, max]",
  });

const boolControlSchema = z.object({
  key: keySchema,
  type: z.literal("bool"),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  default: z.boolean(),
});

export const controlSchema = z.union([floatControlSchema, boolControlSchema]);

const presetSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().min(1),
  colors: z.array(hexColorSchema).optional(),
  values: z.record(z.string(), z.union([z.number(), z.boolean()])).optional(),
});

export const shaderMetaSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "expected kebab-case"),
    name: z.string().min(1),
    description: z.string().min(20),
    category: z.enum(CATEGORIES),
    tags: z.array(z.string().min(1)).min(1),
    colors: z.object({
      default: z.array(hexColorSchema).min(1).max(6),
      labels: z.array(z.string().min(1)),
    }),
    controls: z.array(controlSchema),
    presets: z.array(presetSchema).min(3),
    reactive: z.object({ pointer: z.boolean(), scroll: z.boolean() }),
    /** 1 = light, 2 = moderate, 3 = heavy. Measured, not guessed. */
    cost: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    /** "pro" marks future paid shaders. Everything is free today; see src/access. */
    tier: z.enum(["free", "pro"]),
    license: z.literal("MIT"),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    addedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    featured: z.boolean().optional(),
    /** Time in seconds of the frame used for posters and reduced motion. */
    stillTime: z.number().min(0),
    /** One-line originality note. Details live in the shader's PROVENANCE.md. */
    provenance: z.string().min(10),
  })
  .superRefine((meta, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });
    if (meta.colors.labels.length !== meta.colors.default.length) {
      issue("colors.labels must have one label per colour");
    }
    const keys = meta.controls.map((control) => control.key);
    if (new Set(keys).size !== keys.length) issue("control keys must be unique");
    for (const key of STANDARD_KEYS) {
      const control = meta.controls.find((c) => c.key === key);
      if (!control || control.type !== "float") issue(`missing standard float control "${key}"`);
    }
    if (new Set(meta.presets.map((p) => p.id)).size !== meta.presets.length) {
      issue("preset ids must be unique");
    }
    for (const preset of meta.presets) {
      if (preset.colors && preset.colors.length !== meta.colors.default.length) {
        issue(`preset "${preset.id}" must define ${meta.colors.default.length} colours`);
      }
      for (const [key, value] of Object.entries(preset.values ?? {})) {
        const control = meta.controls.find((c) => c.key === key);
        if (!control) {
          issue(`preset "${preset.id}" sets unknown control "${key}"`);
        } else if (control.type === "float") {
          if (typeof value !== "number" || value < control.min || value > control.max) {
            issue(`preset "${preset.id}" value for "${key}" is out of range`);
          }
        } else if (typeof value !== "boolean") {
          issue(`preset "${preset.id}" value for "${key}" must be a boolean`);
        }
      }
    }
  });

export type ShaderCategory = (typeof CATEGORIES)[number];
export type ShaderControl = z.infer<typeof controlSchema>;
export type ShaderPreset = z.infer<typeof presetSchema>;
export type ShaderMeta = z.infer<typeof shaderMetaSchema>;
export type ShaderTier = ShaderMeta["tier"];
