import { vi } from "vitest";

/**
 * Browser stand-ins for engine tests: a recording WebGL context, controllable
 * observers, a manual animation-frame queue and a switchable media query.
 */

export interface FakeGL {
  calls: string[];
  uniforms: Map<string, unknown>;
  failCompile: boolean;
  /** When true, the program declares u_prev (it uses frame memory). */
  memory: boolean;
}

export function createFakeGL(): { gl: Record<string, unknown>; state: FakeGL } {
  const state: FakeGL = { calls: [], uniforms: new Map(), failCompile: false, memory: false };
  const constants: Record<string, number> = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    TRIANGLES: 8,
    TEXTURE_2D: 9,
    FRAMEBUFFER: 10,
    FRAMEBUFFER_COMPLETE: 11,
    RGBA: 12,
    UNSIGNED_BYTE: 13,
    TEXTURE0: 14,
    COLOR_BUFFER_BIT: 15,
  };
  const setUniform =
    (name: string) =>
    (location: { name: string }, ...values: unknown[]) => {
      state.calls.push(name);
      state.uniforms.set(location.name, values.length === 1 ? values[0] : values);
    };
  const gl: Record<string, unknown> = {
    ...constants,
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => !state.failCompile,
    getShaderInfoLog: () => "ERROR: 0:1: syntax error",
    deleteShader: () => {},
    createProgram: () => ({}),
    attachShader: () => {},
    bindAttribLocation: () => {},
    linkProgram: () => state.calls.push("linkProgram"),
    getProgramParameter: () => true,
    getProgramInfoLog: () => "",
    deleteProgram: () => state.calls.push("deleteProgram"),
    isContextLost: () => false,
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    useProgram: () => {},
    viewport: (...box: number[]) => state.uniforms.set("viewport", box),
    // Like a real context: frame-memory uniforms exist only when declared.
    getUniformLocation: (_program: unknown, name: string) =>
      (name === "u_prev" || name === "u_pass") && !state.memory ? null : { name },
    uniform1i: setUniform("uniform1i"),
    uniform1f: setUniform("uniform1f"),
    uniform2f: setUniform("uniform2f"),
    uniform2fv: setUniform("uniform2fv"),
    uniform3fv: setUniform("uniform3fv"),
    uniform4fv: setUniform("uniform4fv"),
    drawArrays: () => state.calls.push("drawArrays"),
    getExtension: () => null,
    createTexture: () => ({}),
    deleteTexture: () => {},
    bindTexture: () => {},
    texImage2D: () => {},
    texParameteri: () => {},
    activeTexture: () => {},
    createFramebuffer: () => ({}),
    deleteFramebuffer: () => {},
    bindFramebuffer: (_target: number, buffer: unknown) =>
      state.calls.push(buffer ? "bindFramebuffer" : "bindScreen"),
    framebufferTexture2D: () => {},
    checkFramebufferStatus: () => 11,
    clearColor: () => {},
    clear: () => {},
  };
  return { gl, state };
}

type IntersectionCallback = (entries: { target: Element; isIntersecting: boolean }[]) => void;
type ResizeCallback = (
  entries: { target: Element; contentRect: { width: number; height: number } }[],
) => void;

export interface Browser {
  frames: Map<number, FrameRequestCallback>;
  /** Runs every queued animation frame once, at the given timestamp. */
  frame(now: number): void;
  /** Reports an element as inside or outside the viewport to all observers. */
  intersect(target: Element, isIntersecting: boolean): void;
  resize(target: Element, width: number, height: number): void;
  setHidden(hidden: boolean): void;
  setReducedMotion(reduce: boolean): void;
  restore(): void;
}

export function installBrowser(options: { reducedMotion?: boolean } = {}): Browser {
  const frames = new Map<number, FrameRequestCallback>();
  const intersectionObservers = new Set<{
    callback: IntersectionCallback;
    targets: Set<Element>;
  }>();
  const resizeObservers = new Set<{ callback: ResizeCallback; targets: Set<Element> }>();
  const motionListeners = new Set<() => void>();
  let nextFrame = 1;
  let hidden = false;
  let reduce = options.reducedMotion ?? false;

  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(nextFrame, callback);
    return nextFrame++;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    frames.delete(id);
  });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      private record: { callback: IntersectionCallback; targets: Set<Element> };
      constructor(callback: IntersectionCallback) {
        this.record = { callback, targets: new Set() };
        intersectionObservers.add(this.record);
      }
      observe(target: Element) {
        this.record.targets.add(target);
      }
      unobserve(target: Element) {
        this.record.targets.delete(target);
      }
      disconnect() {
        intersectionObservers.delete(this.record);
      }
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      private record: { callback: ResizeCallback; targets: Set<Element> };
      constructor(callback: ResizeCallback) {
        this.record = { callback, targets: new Set() };
        resizeObservers.add(this.record);
      }
      observe(target: Element) {
        this.record.targets.add(target);
      }
      unobserve(target: Element) {
        this.record.targets.delete(target);
      }
      disconnect() {
        resizeObservers.delete(this.record);
      }
    },
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    media: query,
    get matches() {
      return query.includes("prefers-reduced-motion") ? reduce : false;
    },
    addEventListener: (_type: string, listener: () => void) => motionListeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => motionListeners.delete(listener),
  }));
  const hiddenSpy = vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);

  return {
    frames,
    frame(now) {
      const queued = [...frames.entries()];
      frames.clear();
      for (const [, callback] of queued) callback(now);
    },
    intersect(target, isIntersecting) {
      for (const observer of [...intersectionObservers]) {
        if (observer.targets.has(target)) observer.callback([{ target, isIntersecting }]);
      }
    },
    resize(target, width, height) {
      for (const observer of [...resizeObservers]) {
        if (observer.targets.has(target)) {
          observer.callback([{ target, contentRect: { width, height } }]);
        }
      }
    },
    setHidden(value) {
      hidden = value;
      document.dispatchEvent(new Event("visibilitychange"));
    },
    setReducedMotion(value) {
      reduce = value;
      for (const listener of [...motionListeners]) listener();
    },
    restore() {
      hiddenSpy.mockRestore();
      vi.unstubAllGlobals();
    },
  };
}

/** A canvas with a CSS size, whose WebGL (and optionally 2D) context is faked. */
export function createCanvas(
  gl: unknown,
  size: { width: number; height: number } = { width: 400, height: 300 },
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  Object.defineProperty(canvas, "clientWidth", { value: size.width, configurable: true });
  Object.defineProperty(canvas, "clientHeight", { value: size.height, configurable: true });
  const drawImage = vi.fn();
  canvas.getContext = ((type: string) => {
    if (type === "2d") return { drawImage };
    return type === "webgl2" ? gl : null;
  }) as unknown as HTMLCanvasElement["getContext"];
  return canvas;
}
