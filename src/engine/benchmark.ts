import { bindTriangle, createContext, createProgram, drawFrame, setUniforms } from "./runtime";
import type { ShaderSettings } from "./runtime";

export interface BenchmarkResult {
  /** Estimated milliseconds of GPU work per 1280x720 frame on this machine. */
  msPerFrame: number;
}

const WIDTH = 2560;
const HEIGHT = 1440;
/** Draws queued before each forced readback. */
const DRAWS = 8;
const ROUNDS = 10;
/** How many 1280x720 frames one draw at WIDTH x HEIGHT is worth. */
const AREA = (WIDTH * HEIGHT) / (1280 * 720);

/**
 * Measures how expensive a fragment shader is. Browsers pace readbacks to the
 * display refresh, which hides the cost of cheap shaders, so each round queues
 * several large draws before forcing the GPU to finish with a 1x1 readback.
 * That makes the GPU work per round far longer than a refresh interval.
 *
 * The result is scaled to one 1280x720 frame. It depends on the machine and on
 * what else the GPU is doing, so compare shaders within one run only.
 */
export function benchmarkFragment(fragment: string, settings: ShaderSettings): BenchmarkResult {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const gl = createContext(canvas);
  if (!gl) throw new Error("WebGL is not available");
  bindTriangle(gl);
  const program = createProgram(gl, fragment);
  setUniforms(gl, program, settings);
  const pixel = new Uint8Array(4);
  let frame = 0;
  const round = (): void => {
    for (let i = 0; i < DRAWS; i++) {
      drawFrame(gl, program, {
        time: 1 + frame * 0.05,
        width: WIDTH,
        height: HEIGHT,
        pointer: [0.5, 0.5],
        scroll: 0,
      });
      frame += 1;
    }
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  };
  round(); // warm up: shader compilation finishes lazily
  round();
  const start = performance.now();
  for (let i = 0; i < ROUNDS; i++) round();
  const elapsed = performance.now() - start;
  gl.deleteProgram(program.program);
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return { msPerFrame: elapsed / (ROUNDS * DRAWS * AREA) };
}
