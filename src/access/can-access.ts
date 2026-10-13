import type { ShaderMeta } from "@/shaders/schema";

export type Plan = "free" | "pro";

/**
 * Set to true when the Pro plan launches. Until then every shader, including
 * those marked `tier: "pro"`, is available to everyone.
 */
export const PRO_GATING_ENABLED = false;

/**
 * The single entitlement check. Every surface that shows code or serves a
 * registry file goes through here, so turning on Pro is a change in one place.
 */
export function canAccess(shader: Pick<ShaderMeta, "tier">, plan: Plan = "free"): boolean {
  if (!PRO_GATING_ENABLED) return true;
  return shader.tier === "free" || plan === "pro";
}
