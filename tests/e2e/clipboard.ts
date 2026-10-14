import type { Page } from "@playwright/test";

/**
 * Reading the clipboard from a test is only allowed in Chromium. Elsewhere,
 * `recordClipboard` wraps `navigator.clipboard.writeText` before the page loads
 * so the test can see exactly what the site asked to copy (the real write
 * still runs). Call it before `page.goto`.
 */
export async function recordClipboard(page: Page, browserName: string): Promise<void> {
  if (browserName === "chromium") return;
  await page.addInitScript(() => {
    const clipboard = navigator.clipboard;
    if (!clipboard) return;
    const write = clipboard.writeText.bind(clipboard);
    Object.defineProperty(clipboard, "writeText", {
      configurable: true,
      value: async (text: string) => {
        (window as unknown as { __copied?: string }).__copied = text;
        try {
          await write(text);
        } catch {
          // Automation may refuse the real write; the recorded text is what matters.
        }
      },
    });
  });
}

export async function readCopied(page: Page, browserName: string): Promise<string> {
  if (browserName === "chromium") return page.evaluate(() => navigator.clipboard.readText());
  return page.evaluate(() => (window as unknown as { __copied?: string }).__copied ?? "");
}
