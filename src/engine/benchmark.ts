import { bindTriangle, createContext, createProgram, drawFrame, setUniforms } from "./runtime";
import type { ShaderSettings } from "./runtime";

export interface BenchmarkResult {
  /** Average milliseconds of GPU work per 1280x720 frame on this machine. */
  msPerFrame: number;
  frames: number;
}

/**
 * Measures how expensive a fragment shader is by drawing frames to an
 * off-screen canvas and forcing the GPU to finish each one (a 1x1 readback).
 * The number depends on the machine, so it is only meaningful for comparing
 * shaders measured in the same session. Used to assign cost ratings.
 */
export function benchmarkFragment(
  fragment: string,
  settings: ShaderSettings,
  { width = 1280, height = 720, frames = 60 } = {},
): BenchmarkResult {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const gl = createContext(canvas);
  if (!gl) throw new Error("WebGL is not available");
  bindTriangle(gl);
  const program = createProgram(gl, fragment);
  setUniforms(gl, program, settings);
  const pixel = new Uint8Array(4);
  const draw = (index: number): void => {
    drawFrame(gl, program, {
      time: 1 + index * 0.05,
      width,
      height,
      pointer: [0.5, 0.5],
      scroll: 0,
    });
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  };
  for (let i = 0; i < 8; i++) draw(i); // warm up: shader compilation finishes lazily
  const start = performance.now();
  for (let i = 0; i < frames; i++) draw(8 + i);
  const elapsed = performance.now() - start;
  gl.deleteProgram(program.program);
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return { msPerFrame: elapsed / frames, frames };
}
