/// <reference lib="webworker" />
import { highlight, type CodeLanguage } from "./highlight";

/**
 * Runs Shiki off the main thread. Highlighting the React export (about 18,000
 * characters of TSX) takes long enough to freeze the page on a phone; here it
 * only costs the worker's time.
 */
interface Job {
  id: number;
  code: string;
  lang: CodeLanguage;
}

self.onmessage = async (event: MessageEvent<Job>) => {
  const { id, code, lang } = event.data;
  try {
    self.postMessage({ id, html: await highlight(code, lang) });
  } catch {
    self.postMessage({ id, html: null });
  }
};
