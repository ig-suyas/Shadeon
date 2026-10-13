import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acquireDedicated, dedicatedCount, MAX_DEDICATED_CONTEXTS } from "../context-budget";
import { profileFor } from "../device";
import { addSlot, configureShared, resetShared, sharedStats } from "../shared-context";
import { createCanvas, createFakeGL, installBrowser, type Browser, type FakeGL } from "./harness";

describe("shared context", () => {
  let browser: Browser;
  let state: FakeGL;
  let contexts: number;

  beforeEach(() => {
    browser = installBrowser();
    const fake = createFakeGL();
    state = fake.state;
    contexts = 0;
    // Every canvas the engine creates for itself is the shared WebGL surface.
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const element = realCreate(tag);
      if (tag === "canvas") {
        (element as HTMLCanvasElement).getContext = ((type: string) => {
          if (type !== "webgl2") return null;
          contexts += 1;
          return fake.gl;
        }) as unknown as HTMLCanvasElement["getContext"];
      }
      return element;
    });
  });

  afterEach(() => {
    resetShared();
    vi.restoreAllMocks();
    browser.restore();
  });

  const slotCanvas = (): HTMLCanvasElement => createCanvas(null, { width: 200, height: 150 });
  const draws = (): number => state.calls.filter((call) => call === "drawArrays").length;
  const blits = (canvas: HTMLCanvasElement): number =>
    (canvas.getContext("2d") as unknown as { drawImage: ReturnType<typeof vi.fn> }).drawImage.mock
      .calls.length;

  it("uses one WebGL context and one program for many slots", () => {
    const canvases = Array.from({ length: 20 }, slotCanvas);
    for (const canvas of canvases) {
      addSlot(canvas, { fragment: "void main(){}", settings: {} });
      browser.intersect(canvas, true);
    }
    browser.frame(0);
    expect(contexts).toBe(1);
    expect(sharedStats()).toMatchObject({ slots: 20, programs: 1 });
    expect(draws()).toBe(20);
    for (const canvas of canvases) expect(blits(canvas)).toBe(1);
  });

  it("creates no context until a slot is visible", () => {
    addSlot(slotCanvas(), { fragment: "void main(){}", settings: {} });
    browser.frame(0);
    expect(contexts).toBe(0);
    expect(browser.frames.size).toBe(0);
  });

  it("only draws visible slots", () => {
    const a = slotCanvas();
    const b = slotCanvas();
    addSlot(a, { fragment: "void main(){}", settings: {} });
    addSlot(b, { fragment: "void main(){}", settings: {} });
    browser.intersect(a, true);
    browser.frame(0);
    browser.frame(16);
    expect(blits(a)).toBe(2);
    expect(blits(b)).toBe(0);

    browser.intersect(a, false);
    browser.frame(32);
    const settled = draws();
    browser.frame(48);
    expect(draws()).toBe(settled);
    expect(browser.frames.size).toBe(0);
  });

  it("applies each slot's own settings before drawing it", () => {
    const a = slotCanvas();
    const b = slotCanvas();
    const seen: unknown[] = [];
    addSlot(a, { fragment: "void main(){}", settings: { scale: 1 } });
    addSlot(b, { fragment: "void main(){}", settings: { scale: 5 } });
    const original = state.calls.push.bind(state.calls);
    state.calls.push = (...items: string[]) => {
      if (items.includes("drawArrays")) seen.push(state.uniforms.get("u_scale"));
      return original(...items);
    };
    browser.intersect(a, true);
    browser.intersect(b, true);
    browser.frame(0);
    expect(seen).toEqual([1, 5]);
  });

  it("limits how many slots animate at once; the rest hold a still frame", () => {
    configureShared({ maxActive: 2 });
    const canvases = Array.from({ length: 5 }, slotCanvas);
    for (const canvas of canvases) {
      addSlot(canvas, { fragment: "void main(){}", settings: {} });
      browser.intersect(canvas, true);
    }
    browser.frame(0);
    browser.frame(16);
    browser.frame(32);
    expect(canvases.map(blits)).toEqual([3, 3, 1, 1, 1]);
  });

  it("caps the frame rate when configured", () => {
    configureShared({ fps: 30 });
    const canvas = slotCanvas();
    addSlot(canvas, { fragment: "void main(){}", settings: {} });
    browser.intersect(canvas, true);
    for (let now = 0; now <= 1000; now += 1000 / 60) browser.frame(now);
    expect(blits(canvas)).toBeGreaterThanOrEqual(29);
    expect(blits(canvas)).toBeLessThanOrEqual(32);
  });

  it("draws a single still frame under reduced motion", () => {
    browser.restore();
    browser = installBrowser({ reducedMotion: true });
    const canvas = slotCanvas();
    addSlot(canvas, { fragment: "void main(){}", settings: {}, stillTime: 4 });
    browser.intersect(canvas, true);
    browser.frame(0);
    browser.frame(16);
    expect(blits(canvas)).toBe(1);
    expect(state.uniforms.get("u_time")).toBe(4);
  });

  it("sizes the slot from its CSS box and copies the matching region", () => {
    configureShared({ dpr: 2 });
    const canvas = slotCanvas();
    addSlot(canvas, { fragment: "void main(){}", settings: {} });
    browser.intersect(canvas, true);
    browser.frame(0);
    expect([canvas.width, canvas.height]).toEqual([400, 300]);
    expect(state.uniforms.get("u_resolution")).toEqual([400, 300]);
  });

  it("stops drawing a destroyed slot", () => {
    const canvas = slotCanvas();
    const slot = addSlot(canvas, { fragment: "void main(){}", settings: {} });
    browser.intersect(canvas, true);
    browser.frame(0);
    slot.destroy();
    browser.frame(16);
    browser.frame(32);
    expect(blits(canvas)).toBe(1);
    expect(sharedStats().slots).toBe(0);
  });

  it("isolates a failing shader from the others", () => {
    const good = slotCanvas();
    const bad = slotCanvas();
    const onError = vi.fn();
    addSlot(good, { fragment: "void main(){}", settings: {} });
    browser.intersect(good, true);
    browser.frame(0);
    state.failCompile = true;
    addSlot(bad, { fragment: "broken", settings: {}, onError });
    browser.intersect(bad, true);
    browser.frame(16);
    browser.frame(32);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(blits(bad)).toBe(0);
    expect(blits(good)).toBe(3);
  });
});

describe("dedicated context budget", () => {
  it("evicts the oldest holder beyond the limit", () => {
    const evicted: number[] = [];
    const releases = [0, 1, 2].map((id) => acquireDedicated(() => evicted.push(id)));
    expect(evicted).toEqual([0]);
    expect(dedicatedCount()).toBe(MAX_DEDICATED_CONTEXTS);
    for (const release of releases) release();
    expect(dedicatedCount()).toBe(0);
  });
});

describe("device profile", () => {
  it("uses full quality on a capable desktop", () => {
    expect(profileFor({ deviceMemory: 16, hardwareConcurrency: 12 })).toMatchObject({
      lowPower: false,
      cardFps: 0,
      maxActiveCards: 12,
    });
  });

  it("switches to low power for Save-Data or weak hardware", () => {
    expect(profileFor({ saveData: true }).lowPower).toBe(true);
    expect(profileFor({ deviceMemory: 2 }).lowPower).toBe(true);
    expect(profileFor({ hardwareConcurrency: 4 })).toMatchObject({ cardFps: 30, surfaceDpr: 1.5 });
  });

  it("lets an explicit user choice override the heuristics", () => {
    expect(profileFor({ deviceMemory: 2, userLowPower: false }).lowPower).toBe(false);
    expect(profileFor({ deviceMemory: 32, userLowPower: true }).lowPower).toBe(true);
  });

  it("is gentler on touch devices", () => {
    expect(profileFor({ coarsePointer: true, hardwareConcurrency: 8 })).toMatchObject({
      cardFps: 30,
      maxActiveCards: 6,
    });
  });
});
