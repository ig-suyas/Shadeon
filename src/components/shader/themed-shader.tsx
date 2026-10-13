"use client";

import { useCallback, useMemo, useSyncExternalStore, type CSSProperties } from "react";
import { ShaderCanvas } from "@/engine/ShaderCanvas";
import { onThemeChange } from "@/lib/theme";
import type { ShaderMeta } from "@/shaders/schema";

interface ThemedShaderProps {
  shader: ShaderMeta;
  /** CSS custom properties (hex colours) that feed the shader's colours, in order. */
  colorVars: readonly string[];
  /** Non-colour settings. */
  settings?: Record<string, number | boolean>;
  mode?: "shared" | "dedicated";
  className?: string;
  style?: CSSProperties;
}

/**
 * A shader whose colours come from design tokens, so it follows the light and
 * dark themes. The CSS poster uses the same variables, which means the right
 * colours are on screen before any JavaScript runs.
 */
export function ThemedShader({
  shader,
  colorVars,
  settings,
  mode = "dedicated",
  className,
  style,
}: ThemedShaderProps) {
  const key = colorVars.join(",");
  const read = useCallback(() => {
    const computed = getComputedStyle(document.documentElement);
    return key
      .split(",")
      .map((name) => computed.getPropertyValue(name).trim())
      .join(",");
  }, [key]);
  const colors = useSyncExternalStore(onThemeChange, read, () => "");

  const resolved = useMemo(
    () => ({ ...settings, ...(colors ? { colors: colors.split(",") } : {}) }),
    [settings, colors],
  );
  const poster = useMemo(() => {
    const [a, b = a, c = b, d = c] = key.split(",").map((name) => `var(${name})`);
    return [
      `radial-gradient(90% 110% at 18% 12%, ${b} 0%, transparent 62%)`,
      `radial-gradient(80% 90% at 86% 88%, ${c} 0%, transparent 58%)`,
      `radial-gradient(60% 70% at 70% 20%, ${a} 0%, transparent 60%)`,
      d,
    ].join(", ");
  }, [key]);

  return (
    <ShaderCanvas
      shader={shader}
      settings={resolved}
      mode={mode}
      poster={poster}
      className={className}
      style={style}
    />
  );
}
