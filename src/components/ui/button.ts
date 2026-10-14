import { cn } from "@/lib/cn";

type Variant = "solid" | "outline" | "glass" | "quiet";
type Size = "md" | "sm";

// Pressable things are pills (context.md 4, shape rule). Press feedback is a
// slight scale-down; colour changes ease over the "fast" duration.
const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-pill font-medium whitespace-nowrap " +
  "transition-[background-color,border-color,color,opacity,transform,box-shadow] duration-(--duration-fast) ease-out " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  solid: "bg-solid text-solid-text shadow-raised hover:opacity-90",
  outline: "border border-line-strong text-text hover:border-text hover:bg-text/5",
  // For controls that sit directly on a shader: an opaque-enough backing keeps
  // the label readable whatever colours are behind it.
  glass:
    "border border-line-strong bg-bg/65 text-text shadow-raised backdrop-blur-md hover:bg-bg/85 " +
    "supports-[not(backdrop-filter:blur(1px))]:bg-bg",
  quiet: "text-text-muted hover:text-text",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5.5 text-[15px]",
  sm: "h-9 px-4 text-sm",
};

/** Class names for buttons and button-styled links. One shape, four weights. */
export function button(variant: Variant = "solid", size: Size = "md", className?: string): string {
  return cn(base, variants[variant], sizes[size], className);
}
