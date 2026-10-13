import { describe, expect, it } from "vitest";
import { shaders } from "@/shaders/registry";
import type { ShaderMeta } from "@/shaders/schema";
import {
  availableCategories,
  filterShaders,
  hasActiveFilters,
  parseGalleryParams,
  serializeGalleryState,
  tagCounts,
  type GalleryState,
} from "../filters";

const base: GalleryState = {
  q: "",
  category: null,
  tags: [],
  sort: "featured",
  open: null,
  code: null,
};

function make(id: string, patch: Partial<ShaderMeta>): ShaderMeta {
  const template = shaders[0];
  if (!template) throw new Error("catalog is empty");
  return { ...template, id, name: id, description: `Test shader ${id}.`, ...patch };
}

const sample = [
  make("alpha", { category: "gradient", tags: ["soft", "hero"], cost: 2, addedAt: "2026-01-01" }),
  make("bravo", { category: "lines", tags: ["map", "hero"], cost: 1, addedAt: "2026-03-01" }),
  make("charlie", { category: "lines", tags: ["dark"], cost: 3, addedAt: "2026-02-01" }),
];

describe("parseGalleryParams", () => {
  it("returns defaults for an empty query", () => {
    expect(parseGalleryParams(new URLSearchParams(""))).toEqual(base);
  });

  it("reads every supported parameter", () => {
    const state = parseGalleryParams(
      new URLSearchParams("q=aurora&cat=lines&tag=dark&tag=hero&sort=name&s=mesh-drift&code=glsl"),
    );
    expect(state).toEqual({
      q: "aurora",
      category: "lines",
      tags: ["dark", "hero"],
      sort: "name",
      open: "mesh-drift",
      code: "glsl",
    });
  });

  it("drops anything unexpected", () => {
    const state = parseGalleryParams(
      new URLSearchParams(
        "cat=<script>&sort=drop+table&tag=OK&tag=<b>&tag=fine&tag=fine&s=../../etc/passwd&code=php",
      ),
    );
    expect(state.category).toBeNull();
    expect(state.sort).toBe("featured");
    expect(state.tags).toEqual(["fine"]);
    expect(state.open).toBeNull();
    expect(state.code).toBeNull();
  });

  it("caps the query length and the number of tags", () => {
    const tags = Array.from({ length: 30 }, (_, index) => `tag=t${index}`).join("&");
    const state = parseGalleryParams(new URLSearchParams(`q=${"x".repeat(500)}&${tags}`));
    expect(state.q).toHaveLength(60);
    expect(state.tags).toHaveLength(8);
  });
});

describe("serializeGalleryState", () => {
  it("omits defaults", () => {
    expect(serializeGalleryState(base)).toBe("");
  });

  it("round-trips through the parser", () => {
    const state: GalleryState = {
      q: "soft glow",
      category: "aurora",
      tags: ["dark", "hero"],
      sort: "light",
      open: "aurora-veil",
      code: "vanilla",
    };
    const query = serializeGalleryState(state);
    expect(parseGalleryParams(new URLSearchParams(query))).toEqual(state);
  });

  it("only keeps the code tab while a shader is open", () => {
    expect(serializeGalleryState({ ...base, code: "react" })).toBe("");
    expect(serializeGalleryState({ ...base, open: "mesh-drift", code: "react" })).toBe(
      "?s=mesh-drift&code=react",
    );
  });
});

describe("filterShaders", () => {
  const ids = (state: Partial<GalleryState>): string[] =>
    filterShaders(sample, { ...base, ...state }).map((shader) => shader.id);

  it("returns everything in catalog order by default", () => {
    expect(ids({})).toEqual(["alpha", "bravo", "charlie"]);
  });

  it("filters by category", () => {
    expect(ids({ category: "lines" })).toEqual(["bravo", "charlie"]);
  });

  it("requires every selected tag", () => {
    expect(ids({ tags: ["hero"] })).toEqual(["alpha", "bravo"]);
    expect(ids({ tags: ["hero", "map"] })).toEqual(["bravo"]);
  });

  it("searches name, tags and category, case-insensitively, all terms required", () => {
    expect(ids({ q: "BRAVO" })).toEqual(["bravo"]);
    expect(ids({ q: "lines dark" })).toEqual(["charlie"]);
    expect(ids({ q: "  soft  " })).toEqual(["alpha"]);
    expect(ids({ q: "nothing-matches" })).toEqual([]);
  });

  it("sorts without changing the input", () => {
    expect(ids({ sort: "newest" })).toEqual(["bravo", "charlie", "alpha"]);
    expect(ids({ sort: "light" })).toEqual(["bravo", "alpha", "charlie"]);
    expect(ids({ sort: "name" })).toEqual(["alpha", "bravo", "charlie"]);
    expect(sample.map((shader) => shader.id)).toEqual(["alpha", "bravo", "charlie"]);
  });
});

describe("facets", () => {
  it("lists only categories that have shaders", () => {
    expect(availableCategories(sample)).toEqual(["gradient", "lines"]);
  });

  it("orders tags by use, then name", () => {
    expect(tagCounts(sample)).toEqual([
      { tag: "hero", count: 2 },
      { tag: "dark", count: 1 },
      { tag: "map", count: 1 },
      { tag: "soft", count: 1 },
    ]);
  });

  it("knows when filters are active", () => {
    expect(hasActiveFilters(base)).toBe(false);
    expect(hasActiveFilters({ ...base, sort: "name", open: "alpha" })).toBe(false);
    expect(hasActiveFilters({ ...base, q: " a " })).toBe(true);
    expect(hasActiveFilters({ ...base, tags: ["hero"] })).toBe(true);
  });
});
