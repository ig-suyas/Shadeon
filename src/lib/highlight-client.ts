import type { CodeLanguage } from "./highlight";

/**
 * Highlights code in a Web Worker so the page never freezes while Shiki runs.
 * If workers are unavailable or the worker fails, it falls back to
 * highlighting on the main thread, which is slower but still works.
 */

let worker: Worker | null | undefined;
let nextId = 0;
const pending = new Map<number, (html: string | null) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL("./highlight.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ id: number; html: string | null }>) => {
      pending.get(event.data.id)?.(event.data.html);
      pending.delete(event.data.id);
    };
    worker.onerror = () => {
      // Hand every waiting job to the fallback and stop using the worker.
      worker?.terminate();
      worker = null;
      for (const resolve of pending.values()) resolve(null);
      pending.clear();
    };
  } catch {
    worker = null;
  }
  return worker;
}

async function onMainThread(code: string, lang: CodeLanguage): Promise<string> {
  const { highlight } = await import("./highlight");
  return highlight(code, lang);
}

export async function highlightOffThread(code: string, lang: CodeLanguage): Promise<string> {
  const instance = getWorker();
  if (!instance) return onMainThread(code, lang);
  const id = nextId++;
  const html = await new Promise<string | null>((resolve) => {
    pending.set(id, resolve);
    instance.postMessage({ id, code, lang });
  });
  return html ?? onMainThread(code, lang);
}
