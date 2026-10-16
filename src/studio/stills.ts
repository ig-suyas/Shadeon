import { mountStudio, type StudioMaterial, type StudioOptions } from "./core";

/**
 * Still frames of studio shaders for gallery cards. Cards cannot each own a
 * WebGL context, so stills are rendered one at a time on a short-lived
 * context, copied into the card's 2D canvas and released.
 */

let queue: Promise<void> = Promise.resolve();

export interface StillRequest {
  material: StudioMaterial;
  /** CSS size of the card surface. */
  width: number;
  height: number;
  dpr: number;
  options: Pick<StudioOptions, "params" | "ranges" | "colors" | "light" | "lowPower">;
  /** Draws the finished frame; called only if the request is still wanted. */
  paint: (source: HTMLCanvasElement) => void;
  cancelled: () => boolean;
}

export function requestStill(request: StillRequest): Promise<boolean> {
  const job = queue.then(
    () =>
      new Promise<boolean>((resolve) => {
        if (request.cancelled()) {
          resolve(false);
          return;
        }
        const canvas = document.createElement("canvas");
        let failed = false;
        const handle = mountStudio(canvas, request.material, {
          ...request.options,
          still: true,
          intro: false,
          interactive: false,
          preserveDrawingBuffer: true,
          maxDpr: request.dpr,
          size: { width: request.width, height: request.height },
          onError: () => {
            failed = true;
          },
        });
        if (!failed && !request.cancelled()) request.paint(canvas);
        handle.destroy();
        // Yield so a page full of cards never blocks input for long.
        setTimeout(() => resolve(!failed), 0);
      }),
  );
  queue = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}
