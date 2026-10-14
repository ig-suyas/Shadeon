"use client";

import { LockSimpleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import type { ExportTarget } from "@/export/targets";
import { fetchCode, loginHere, SignInRequired, useSession } from "@/lib/session-client";
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
 * Copies a shader's production code for the given settings. The code is
 * generated on the server for signed-in visitors; a signed-out visitor gets a
 * button that goes to sign-in and comes back to this page.
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
  const session = useSession();
  const router = useRouter();

  const current = useCallback((): Record<string, unknown> | undefined => {
    if (!colorVars) return settings;
    const computed = getComputedStyle(document.documentElement);
    return {
      ...settings,
      colors: colorVars.map((name) => computed.getPropertyValue(name).trim()),
    };
  }, [settings, colorVars]);

  const warm = useCallback(() => {
    if (session.status === "signed-in") void fetchCode(shader.id, current()).catch(() => {});
  }, [session.status, shader.id, current]);

  if (session.status === "signed-out") {
    return (
      <button
        type="button"
        onClick={() => router.push(loginHere())}
        className={button(variant, size, className)}
        data-testid="copy-sign-in"
      >
        <LockSimpleIcon size={size === "sm" ? 16 : 18} aria-hidden="true" />
        Sign in to copy
      </button>
    );
  }

  const build = async (): Promise<string> => {
    try {
      const { exports } = await fetchCode(shader.id, current());
      return exports[target].code;
    } catch (error) {
      if (error instanceof SignInRequired) router.push(loginHere());
      throw error;
    }
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
