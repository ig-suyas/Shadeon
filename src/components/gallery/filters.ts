import { EXPORT_TARGETS, type ExportTarget } from "@/export/targets";
import { CATEGORIES, type ShaderCategory } from "@/shaders/categories";
import type { ShaderMeta } from "@/shaders/schema";

/**
 * Gallery state lives in the URL so every view is shareable:
 *   ?q=aurora&cat=lines&tag=dark&tag=hero&sort=name   filters
 *   ?s=mesh-drift                                     expanded shader
 *   ?s=mesh-drift&code=react                          with the code panel open
 */

export const SORTS = ["featured", "newest", "name", "light"] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABELS: Record<Sort, string> = {
  featured: "Featured",
  newest: "Newest",
  name: "Name",
  light: "Lightest first",
};

export interface GalleryState {
  q: string;
  category: ShaderCategory | null;
  tags: string[];
  sort: Sort;
  /** Id of the expanded shader, if any. */
  open: string | null;
  /** Code panel tab, if the panel is open. */
  code: ExportTarget | null;
}

type ParamSource = Pick<URLSearchParams, "get" | "getAll">;

const MAX_QUERY = 60;
const MAX_TAGS = 8;
const TAG = /^[a-z0-9][a-z0-9-]{0,31}$/;

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return allowed.includes(value as T) ? (value as T) : null;
}

/** Reads untrusted query parameters into a valid state. Anything unexpected is dropped. */
export function parseGalleryParams(params: ParamSource): GalleryState {
  const open = params.get("s");
  return {
    q: (params.get("q") ?? "").slice(0, MAX_QUERY),
    category: oneOf(params.get("cat"), CATEGORIES),
    tags: [...new Set(params.getAll("tag").filter((tag) => TAG.test(tag)))].slice(0, MAX_TAGS),
    sort: oneOf(params.get("sort"), SORTS) ?? "featured",
    open: open && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(open) && open.length <= 48 ? open : null,
    code: oneOf(params.get("code"), EXPORT_TARGETS),
  };
}

/** Canonical query string for a state. Defaults are left out to keep URLs short. */
export function serializeGalleryState(state: GalleryState): string {
  const params = new URLSearchParams();
  const q = state.q.trim();
  if (q) params.set("q", q);
  if (state.category) params.set("cat", state.category);
  for (const tag of state.tags) params.append("tag", tag);
  if (state.sort !== "featured") params.set("sort", state.sort);
  if (state.open) {
    params.set("s", state.open);
    if (state.code) params.set("code", state.code);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function hasActiveFilters(state: GalleryState): boolean {
  return state.q.trim() !== "" || state.category !== null || state.tags.length > 0;
}

export function filterShaders(shaders: readonly ShaderMeta[], state: GalleryState): ShaderMeta[] {
  const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = shaders.filter((shader) => {
    if (state.category && shader.category !== state.category) return false;
    if (!state.tags.every((tag) => shader.tags.includes(tag))) return false;
    if (terms.length === 0) return true;
    const haystack = [shader.name, shader.description, shader.category, ...shader.tags]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
  switch (state.sort) {
    case "newest":
      return matches.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    case "name":
      return matches.sort((a, b) => a.name.localeCompare(b.name));
    case "light":
      return matches.sort((a, b) => a.cost - b.cost);
    case "featured":
      return matches;
  }
}

/** Categories that have at least one shader, in schema order. */
export function availableCategories(shaders: readonly ShaderMeta[]): ShaderCategory[] {
  const present = new Set(shaders.map((shader) => shader.category));
  return CATEGORIES.filter((category) => present.has(category));
}

/** Tags ordered by how many shaders use them, then alphabetically. */
export function tagCounts(shaders: readonly ShaderMeta[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const shader of shaders) {
    for (const tag of shader.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
