import type { ShaderMeta } from "./schema";

export const COST_LABELS: Record<ShaderMeta["cost"], { label: string; detail: string }> = {
  1: {
    label: "Light",
    detail:
      "A few noise lookups per pixel. Comfortable as a full-page background on phones and older laptops.",
  },
  2: {
    label: "Moderate",
    detail:
      "Layered noise per pixel. Fine full-screen on recent phones and laptops; on weak GPUs the resolution steps down automatically.",
  },
  3: {
    label: "Heavy",
    detail:
      "Many samples per pixel. Best in a contained area such as a hero or a card, or with maxDpr set to 1.",
  },
};

/** Up to `limit` other shaders, closest first: same category, then most shared tags. */
export function relatedShaders(
  shader: ShaderMeta,
  all: readonly ShaderMeta[],
  limit = 3,
): ShaderMeta[] {
  return all
    .filter((other) => other.id !== shader.id)
    .map((other, index) => ({
      other,
      index,
      score:
        (other.category === shader.category ? 10 : 0) +
        other.tags.filter((tag) => shader.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.other);
}
