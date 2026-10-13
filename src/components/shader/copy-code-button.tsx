"use client";

import { useCallback } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import type { ExportTarget } from "@/export/targets";
import { loadFragment } from "@/shaders/loaders";
import type { ShaderMeta } from "@/shaders/schema";

interface CopyCodeButtonProps {
  shader: ShaderMeta;
  settings?: Record<string, unknown>;
  /** CSS custom properties to read the colours from at click time (for theme-driven shaders). */
  colorVars?: readonly string[];
  target?: ExportTarget;
  label: string;
  variant?: "solid" | "outline" | "glass";
  size?: "md" | "sm";
  className?: string;
}

/**
 * Copies a shader's production code for the given settings. The generator and
 * the shader source load on demand, so pages that only show the button stay light.
 */
export function CopyCodeButton({
  shader,
  settings,
  colorVars,
  target = "react",
  label,
  variant = "outline",
  size = "md",
  className,
}: CopyCodeButtonProps) {
  const warm = useCallback(() => {
    void import("@/export/generate");
    void loadFragment(shader.id).catch(() => {});
  }, [shader.id]);

  const build = async (): Promise<string> => {
    let current = settings;
    if (colorVars) {
      const computed = getComputedStyle(document.documentElement);
      current = {
        ...settings,
        colors: colorVars.map((name) => computed.getPropertyValue(name).trim()),
      };
    }
    const [{ generateExport }, fragment] = await Promise.all([
      import("@/export/generate"),
      loadFragment(shader.id),
    ]);
    return generateExport({ meta: shader, fragment, settings: current }, target).code;
  };

  return (
    <CopyButton
      text={build}
      label={label}
      variant={variant}
      size={size}
      className={className}
      onWarm={warm}
    />
  );
}
