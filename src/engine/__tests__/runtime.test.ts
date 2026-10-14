import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQualityGovernor, hexToRgb, mountShader } from "../runtime";
import { createCanvas, createFakeGL, installBrowser, type Browser } from "./harness";

const FRAGMENT = "void main(){}";

describe("hexToRgb", () => {
  it("parses long and short hex", () => {
    expect(hexToRgb("#ff0000")).toEqual([1, 0, 0]);
    expect(hexToRgb("#0f0")).toEqual([0, 1, 0]);
    expect(hexToRgb("0000FF")).toEqual([0, 0, 1]);
  });

  it("falls back to black on invalid input", () => {
    expect(hexToRgb("red")).toEqual([0, 0, 0]);
    expect(hexToRgb("#12345")).toEqual([0, 0, 0]);
    expect(hexToRgb("#gggggg")).toEqual([0, 0, 0]);
  });
});

describe("createQualityGovernor", () => {
  it("holds full quality at 60 fps", () => {
    const governor = createQualityGovernor();
    for (let i = 0; i < 2000; i++) governor.sample(16.7);
    expect(governor.scale).toBe(1);
  });

  it("steps down after a sustained run of slow frames", () => {
    const governor = createQualityGovernor();
    let changed = false;
    for (let i = 0; i < 70; i++) changed = governor.sample(34) || changed;
    expect(changed).toBe(true);
    expect(governor.scale).toBe(0.75);
  });

  it("ignores one-off hitches and tab switches", () => {
    const governor = createQualityGovernor();
    for (let i = 0; i < 200; i++) governor.sample(i % 50 === 0 ? 5000 : 16.7);
    expect(governor.scale).toBe(1);
  });

  it("recovers slowly, and waits longer each time", () => {
    const governor = createQualityGovernor();
    for (let i = 0; i < 70; i++) governor.sample(34);
    expect(governor.scale).toBe(0.75);
    for (let i = 0; i < 300; i++) governor.sample(16.7);
    expect(governor.scale).toBe(0.75);
    for (let i = 0; i < 400; i++) governor.sample(16.7);
    expect(governor.scale).toBe(1);

    for (let i = 0; i < 70; i++) governor.sample(34);
    for (let i = 0; i < 800; i++) governor.sample(16.7);
    expect(governor.scale).toBe(0.75);
  });

  it("never goes below the last step", () => {
    const governor = createQualityGovernor();
    for (let i = 0; i < 2000; i++) governor.sample(40);
    expect(governor.scale).toBe(0.5);
  });
});

describe("mountShader lifecycle", () => {
  let browser: Browser;

  beforeEach(() => {
    browser = installBrowser();
  });

  afterEach(() => {
    browser.restore();
  });

  const draws = (calls: string[]): number => calls.filter((call) => call === "drawArrays").length;

  it("does not touch WebGL until the canvas is visible", () => {
    const { gl, state } = createFakeGL();
    const canvas = createCanvas(gl);
    const getContext = vi.spyOn(canvas, "getContext");
    mountShader(canvas, FRAGMENT);
    browser.frame(16);
    expect(getContext).not.toHaveBeenCalled();
    expect(state.calls).toEqual([]);

    browser.intersect(canvas, true);
    expect(getContext).toHaveBeenCalled();
    browser.frame(32);
    expect(draws(state.calls)).toBe(1);
  });

  it("animates while visible and stops when scrolled away", () => {
    const { gl, state } = createFakeGL();
    const canvas = createCanvas(gl);
    mountShader(canvas, FRAGMENT);
    browser.intersect(canvas, true);
    browser.frame(0);
    browser.frame(16);
    browser.frame(32);
    expect(draws(state.calls)).toBe(3);

    browser.intersect(canvas, false);
    browser.frame(48); // the already-queued frame may run, then the loop must end
    const settled = draws(state.calls);
    browser.frame(64);
    browser.frame(80);
    expect(draws(state.calls)).toBe(settled);
    expect(browser.frames.size).toBe(0);

    browser.intersect(canvas, true);
    browser.frame(96);
    expect(draws(state.calls)).toBe(settled + 1);
  });

  it("pauses while the tab is hidden", () => {
    const { gl, state } = createFakeGL();
    const canvas = createCanvas(gl);
    mountShader(canvas, FRAGMENT);
    browser.intersect(canvas, true);
    browser.frame(0);
    browser.setHidden(true);
    browser.frame(16);
    const settled = draws(state.calls);
    browser.frame(32);
    expect(draws(state.calls)).toBe(settled);
    expect(browser.frames.size).toBe(0);

    browser.setHidden(false);
    browser.frame(48);
    expect(draws(state.calls)).toBe(settled + 1);
  });

  it("advances time by elapsed seconds times speed", () => {
    const { gl, state } = createFakeGL();
    const canvas = createCanvas(gl);
    mountShader(canvas, FRAGMENT, { settings: { speed: 2 } });
    browser.intersect(canvas, true);
    browser.frame(1000);
    browser.frame(1050);
    expect(state.uniforms.get("u_time")).toBeCloseTo(0.1, 5);
  });

  it("does not jump ahead after being hidden for a long time", () => {
    const { gl, state } = createFakeGL();
    const canvas = createCanvas(gl);
    mountShader(canvas, FRAGMENT);
    browser.intersect(canvas, true);
    browser.frame(0);
    browser.frame(16);
    browser.setHidden(true);
    browser.frame(32);
    browser.setHidden(false);
    browser.frame(60_000);
    browser.frame(60_016);
    expect(state.uniforms.get("u_time") as number).toBeLessThan(0.1);
  });

  it("draws one still frame under reduced motion", () => {
    browser.restore();
    browser = installBrowser({ reducedMotion: true });
    const { gl, state } = createFakeGL();
    const canvas = createCanvas(gl);
    mountShader(canvas, FRAGMENT, { stillTime: 6 });
    browser.intersect(canvas, true);
    browser.frame(0);
    browser.frame(16);
    browser.frame(32);
    expect(draws(state.calls)).toBe(1);
    expect(state.uniforms.get("u_time")).toBe(6);
    expect(browser.frames.size).toBe(0);

    browser.setReducedMotion(false);
    browser.frame(48);
    browser.frame(64);
    expect(draws(state.calls)).toBe(3);
  });

  it("keeps animating under reduced motion when told to ignore it", () => {
    browser.restore();
    browser = installBrowser({ reducedMotion: true });
    const { gl, state } = createFakeGL();
    const canvas = createCanvas(gl);
    mountShader(canvas, FRAGMENT, { reducedMotion: "ignore" });
    browser.intersect(canvas, true);
    browser.frame(0);
    browser.frame(16);
    expect(draws(state.calls)).toBe(2);
  });

  it("redraws a paused shader only when something changes", () => {
    const { gl, state } = createFakeGL();
    const canvas = createCanvas(gl);
    const handle = mountShader(canvas, FRAGMENT, { paused: true });
    browser.intersect(canvas, true);
    browser.frame(0);
    browser.frame(16);
    expect(draws(state.calls)).toBe(1);

    handle.set({ scale: 2 });
    browser.frame(32);
    expect(draws(state.calls)).toBe(2);
    expect(state.uniforms.get("u_scale")).toBe(2);

    handle.play();
    browser.frame(48);
    browser.frame(64);
    expect(draws(state.calls)).toBe(4);
  });

  it("sizes the drawing buffer from CSS size and a capped pixel ratio", () => {
    vi.stubGlobal("devicePixelRatio", 3);
    const { gl } = createFakeGL();
    const canvas = createCanvas(gl, { width: 400, height: 300 });
    mountShader(canvas, FRAGMENT, { maxDpr: 1.5 });
    browser.intersect(canvas, true);
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(450);
  });

  it("caps the pixel ratio at 1.5 by default", () => {
    vi.stubGlobal("devicePixelRatio", 3);
    const { gl } = createFakeGL();
    const canvas = createCanvas(gl, { width: 400, height: 300 });
    mountShader(canvas, FRAGMENT);
    browser.intersect(canvas, true);
    expect(canvas.width).toBe(600);
  });

  it("asks for an alpha channel only when the canvas is transparent", () => {
    const attributes = (transparent?: boolean): unknown => {
      const { gl } = createFakeGL();
      const canvas = createCanvas(gl);
      const getContext = vi.spyOn(canvas, "getContext");
      mountShader(canvas, FRAGMENT, transparent === undefined ? {} : { transparent });
      browser.intersect(canvas, true);
      return getContext.mock.calls[0]?.[1];
    };
    expect(attributes()).toMatchObject({ alpha: false });
    expect(attributes(true)).toMatchObject({ alpha: true });
  });

  it("raises u_activity while the pointer moves and lets it fade when it stops", () => {
    const { gl, state } = createFakeGL();
    const canvas = createCanvas(gl, { width: 400, height: 300 });
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300 }) as DOMRect;
    mountShader(canvas, FRAGMENT);
    browser.intersect(canvas, true);
    let now = 0;
    for (let i = 0; i < 20; i++) {
      window.dispatchEvent(
        new MouseEvent("pointermove", { clientX: 100 + i * 10, clientY: 150 }) as PointerEvent,
      );
      browser.frame((now += 16.7));
    }
    const moving = state.uniforms.get("u_activity") as number;
    expect(moving).toBeGreaterThan(0.3);
    for (let i = 0; i < 300; i++) browser.frame((now += 16.7));
    expect(state.uniforms.get("u_activity") as number).toBeLessThan(moving * 0.05);
  });

  it("steps frame memory, then draws it, for shaders that declare u_prev", () => {
    const { gl, state } = createFakeGL();
    state.memory = true;
    const canvas = createCanvas(gl);
    mountShader(canvas, FRAGMENT);
    browser.intersect(canvas, true);
    browser.frame(16);
    // One frame = pass 0 into a texture, then pass 1 to the screen.
    expect(draws(state.calls)).toBe(2);
    expect(state.calls).toContain("bindFramebuffer");
    expect(state.uniforms.get("u_pass")).toBe(1);
    expect(state.uniforms.has("u_delta")).toBe(true);
  });

  it("warms up frame memory before a reduced-motion still frame", () => {
    browser.restore();
    browser = installBrowser({ reducedMotion: true });
    const { gl, state } = createFakeGL();
    state.memory = true;
    const canvas = createCanvas(gl);
    mountShader(canvas, FRAGMENT, { stillTime: 5 });
    browser.intersect(canvas, true);
    browser.frame(16);
    // 60 warm-up steps (pass 0 only) plus the final two passes.
    expect(draws(state.calls)).toBe(62);
  });

  it("does not allocate frame memory for ordinary shaders", () => {
    const { gl, state } = createFakeGL();
    const canvas = createCanvas(gl);
    mountShader(canvas, FRAGMENT);
    browser.intersect(canvas, true);
    browser.frame(16);
    expect(draws(state.calls)).toBe(1);
    expect(state.calls).not.toContain("bindFramebuffer");
  });

  it("maps settings to uniforms", () => {
    const { gl, state } = createFakeGL();
    const canvas = createCanvas(gl);
    mountShader(canvas, FRAGMENT, {
      settings: { colors: ["#ff0000", "#00ff00"], intensity: 0.5, grain: true, speed: 3 },
    });
    browser.intersect(canvas, true);
    expect(state.uniforms.get("u_color1")).toEqual([1, 0, 0]);
    expect(state.uniforms.get("u_color2")).toEqual([0, 1, 0]);
    expect(state.uniforms.get("u_intensity")).toBe(0.5);
    expect(state.uniforms.get("u_grain")).toBe(1);
    expect(state.uniforms.has("u_speed")).toBe(false);
  });

  it("reports an error and stays idle when WebGL is unavailable", () => {
    const canvas = createCanvas(null);
    const onError = vi.fn();
    mountShader(canvas, FRAGMENT, { onError });
    browser.intersect(canvas, true);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(browser.frames.size).toBe(0);
  });

  it("reports the compiler log when a shader fails to compile", () => {
    const { gl, state } = createFakeGL();
    state.failCompile = true;
    const canvas = createCanvas(gl);
    const onError = vi.fn();
    mountShader(canvas, FRAGMENT, { onError });
    browser.intersect(canvas, true);
    expect((onError.mock.calls[0]?.[0] as Error).message).toContain("syntax error");
  });

  it("calls onReady once, after the first frame", () => {
    const { gl } = createFakeGL();
    const canvas = createCanvas(gl);
    const onReady = vi.fn();
    mountShader(canvas, FRAGMENT, { onReady });
    browser.intersect(canvas, true);
    expect(onReady).not.toHaveBeenCalled();
    browser.frame(0);
    browser.frame(16);
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("rebuilds the program after a lost context is restored", () => {
    const { gl, state } = createFakeGL();
    const canvas = createCanvas(gl);
    mountShader(canvas, FRAGMENT);
    browser.intersect(canvas, true);
    browser.frame(0);
    const lost = new Event("webglcontextlost", { cancelable: true });
    canvas.dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true);
    expect(browser.frames.size).toBe(0);

    canvas.dispatchEvent(new Event("webglcontextrestored"));
    expect(state.calls.filter((call) => call === "linkProgram")).toHaveLength(2);
    browser.frame(16);
    expect(draws(state.calls)).toBe(2);
  });

  it("stops everything on destroy", () => {
    const { gl, state } = createFakeGL();
    const canvas = createCanvas(gl);
    const handle = mountShader(canvas, FRAGMENT);
    browser.intersect(canvas, true);
    browser.frame(0);
    handle.destroy();
    expect(browser.frames.size).toBe(0);
    expect(state.calls).toContain("deleteProgram");
    const settled = draws(state.calls);
    browser.intersect(canvas, true);
    browser.setHidden(false);
    browser.frame(16);
    expect(draws(state.calls)).toBe(settled);
  });
});
