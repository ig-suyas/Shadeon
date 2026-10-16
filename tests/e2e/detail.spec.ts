import { readCopied, recordClipboard } from "./clipboard";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import { shaders } from "../../src/shaders/registry";

// Every shader in the catalog gets the export-vs-preview pixel comparison.
const SHADERS = shaders.map((shader) => shader.id);
const STUDIO = new Set(shaders.filter((s) => s.engine === "studio").map((s) => s.id));

function preview(page: Page): Locator {
  return page.locator("[data-testid=detail-preview] [data-shader]");
}

test.describe("shader page", () => {
  test("shows the shader, the controls and a Code button under the preview", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/shaders/pointer-glow");
    await expect(page.getByRole("heading", { level: 1, name: "Pointer Glow" })).toBeVisible();
    await expect(page.getByTestId("detail-code")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Customize" })).toBeVisible();
    await expect(page.getByRole("slider", { name: "Speed" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Props" })).toBeVisible();
    // Phones get a stacked list of props instead of a table that scrolls sideways.
    if (isMobile) {
      await expect(page.getByRole("term").filter({ hasText: /^colors$/ })).toBeVisible();
      await expect(page.getByRole("table")).toBeHidden();
    } else {
      await expect(page.getByRole("rowheader", { name: "colors" })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Related shaders" })).toBeVisible();
  });

  test("an unknown shader answers 404 with the not-found page", async ({ page }) => {
    const response = await page.goto("/shaders/does-not-exist");
    // A real status, not a "soft 404": src/proxy.ts answers before rendering starts.
    expect(response?.status()).toBe(404);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
    await expect(page.getByRole("heading", { name: "Customize" })).toHaveCount(0);
  });

  test("the code updates live as controls change", async ({ page }) => {
    await page.goto("/shaders/pointer-glow");
    const code = page.getByTestId("code-panel").getByRole("tabpanel");
    await expect(code).toContainText("speed = 1,");

    const speed = page.getByRole("slider", { name: "Speed" });
    await speed.focus();
    await speed.press("End");
    await expect(code).toContainText("speed = 3,");
    await expect(page).toHaveURL(/speed=3/);

    await page.getByRole("button", { name: "Candle" }).click();
    await expect(code).toContainText('"#ff9a4d"');
    await expect(page.getByRole("button", { name: "Candle" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const hex = page.getByRole("textbox", { name: "Lamp light", exact: true });
    await hex.fill("#123456");
    await expect(code).toContainText('"#123456"');
    await hex.fill("nope");
    await expect(page.getByText("Use a hex colour like #1a2b3c.")).toBeVisible();
    await expect(code).toContainText('"#123456"');
  });

  test("randomize changes the settings and reset restores the defaults", async ({ page }) => {
    await page.goto("/shaders/ink-bloom");
    const reset = page.getByRole("button", { name: "Reset" });
    await expect(reset).toBeDisabled();
    await page.getByRole("button", { name: "Randomize" }).click();
    await expect(page).toHaveURL(/[?&]c=/);
    await expect(reset).toBeEnabled();
    await reset.click();
    await expect(page).toHaveURL(/\/shaders\/ink-bloom$/);
    await expect(reset).toBeDisabled();
  });

  test("a shared link restores the tuned settings", async ({ page }) => {
    await page.goto("/shaders/contour-field?c=0a2a66-3f6fc4-eaf2ff&levels=20&intensity=0.8");
    await expect(page.getByRole("button", { name: "Blueprint" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("slider", { name: "Levels" })).toHaveValue("20");
    await expect(page.getByTestId("code-panel").getByRole("tabpanel")).toContainText(
      "levels = 20,",
    );
  });

  test("hostile query values are ignored", async ({ page }) => {
    await page.goto(
      "/shaders/pointer-glow?c=%3Cscript%3E-zzzzzz&speed=1e999&scale=%22%3E%3Cimg%20src=x%20onerror=alert(1)%3E",
    );
    await expect(page.getByRole("slider", { name: "Speed" })).toHaveValue("1");
    await expect(page.getByRole("textbox", { name: "Lamp light", exact: true })).toHaveValue(
      "#7aa7ff",
    );
    expect(await page.locator("img[src=x]").count()).toBe(0);
  });

  test("the viewer's Customize link carries the chosen preset to the shader page", async ({
    page,
  }) => {
    await page.goto("/shaders?s=pointer-glow");
    const dialog = page.getByTestId("shader-viewer");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Emerald" }).click();
    await dialog.getByTestId("viewer-customize").click();
    await expect(page).toHaveURL(/\/shaders\/pointer-glow\?c=04100c/);
    await expect(page.getByRole("button", { name: "Emerald" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

/**
 * The promise of the site: the code you copy draws what the preview shows.
 * With reduced motion both sides draw one still frame at the same time, so
 * their pixels can be compared directly.
 */
/**
 * WebKit and Firefox screenshot a WebGL canvas from its drawing buffer, which
 * the browser clears after showing each frame unless preserveDrawingBuffer is
 * set; Chromium captures what is on screen. For those browsers only, the test
 * turns preserving on in both pages so the screenshots hold the real pixels.
 * The site and the export keep the faster default.
 */
const PRESERVE_WEBGL = `(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, options) {
    const webgl = type === "webgl" || type === "webgl2" || type === "experimental-webgl";
    return original.call(this, type, webgl ? { ...options, preserveDrawingBuffer: true } : options);
  };
})();`;

async function preserveWebGL(page: Page, browserName: string): Promise<void> {
  if (browserName === "chromium") return;
  await page.addInitScript({ content: PRESERVE_WEBGL });
}

interface Pixels {
  width: number;
  height: number;
  data: Uint8Array;
}

/**
 * The canvas's pixels. Chromium: an element screenshot. Elsewhere, element
 * screenshots of opaque WebGL canvases come back black (WebKit on Windows),
 * so the drawing buffer is read directly; preserveWebGL keeps it intact.
 */
async function capture(canvas: Locator, browserName: string, path: string): Promise<Pixels> {
  if (browserName === "chromium") return PNG.sync.read(await canvas.screenshot({ path }));
  const { width, height, base64 } = await canvas.evaluate((element: HTMLCanvasElement) => {
    const gl = (element.getContext("webgl2") ??
      element.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) throw new Error("no WebGL context on the canvas");
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const raw = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, raw);
    // WebGL rows run bottom-up; flip them to match an image.
    const flipped = new Uint8Array(raw.length);
    for (let y = 0; y < h; y++) {
      flipped.set(raw.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    }
    let binary = "";
    for (let i = 0; i < flipped.length; i += 0x8000) {
      binary += String.fromCharCode(...flipped.subarray(i, i + 0x8000));
    }
    return { width: w, height: h, base64: btoa(binary) };
  });
  return { width, height, data: new Uint8Array(Buffer.from(base64, "base64")) };
}

test.describe("exported code matches the preview", () => {
  test.use({ reducedMotion: "reduce" });

  for (const id of SHADERS) {
    test(id, async ({ page, context, isMobile, browserName }, testInfo) => {
      test.skip(isMobile, "one pixel comparison per shader is enough");
      await page.setViewportSize({ width: 1280, height: 900 });
      await recordClipboard(page, browserName);
      await preserveWebGL(page, browserName);
      await page.goto(`/shaders/${id}`);
      // A fixed, whole-pixel size so both canvases have identical drawing buffers.
      await page.addStyleTag({
        content:
          "[data-testid=detail-preview] [data-shader]{position:fixed!important;top:80px!important;left:0!important;z-index:999!important;width:800px!important;height:500px!important;aspect-ratio:auto!important;border:0!important;border-radius:0!important}",
      });
      const surface = preview(page);
      await expect(surface).toHaveAttribute("data-status", "live", { timeout: 20_000 });
      await page.waitForTimeout(900); // poster cross-fade
      const box = await surface.boundingBox();
      if (!box) throw new Error("preview has no box");
      const width = Math.round(box.width);
      const height = Math.round(box.height);

      await page.getByTestId("code-panel").getByRole("tab", { name: "JavaScript" }).click();
      await page.getByTestId("code-panel").getByRole("button", { name: "Copy code" }).click();
      const code = await readCopied(page, browserName);
      const studio = STUDIO.has(id);
      expect(code).toContain(
        studio ? "mountStudio(canvas, material" : "mountShader(canvas, fragment",
      );

      const standalone = await context.newPage();
      await standalone.setViewportSize({ width: 1280, height: 900 });
      // setContent writes a fresh document without running init scripts, so the
      // preserve shim goes inline, ahead of the export (non-Chromium only).
      const shim = browserName === "chromium" ? "" : `<script>${PRESERVE_WEBGL}</script>`;
      await standalone.setContent(
        `<!doctype html><html><body style="margin:0;background:#000">
          ${shim}
          ${
            studio
              ? // Studio exports mount on a host element that holds the canvas.
                `<div id="${id}" style="position:relative;width:${width}px;height:${height}px">
                  <canvas style="position:absolute;inset:0;display:block;width:100%;height:100%"></canvas>
                </div>`
              : `<div style="width:${width}px;height:${height}px">
                  <canvas id="${id}" style="display:block;width:100%;height:100%"></canvas>
                </div>`
          }
          <script type="module">${code}</script>
        </body></html>`,
      );
      await standalone.waitForTimeout(1200);

      // Copying scrolled the page to the code panel. Scroll-reactive shaders read the
      // scroll position, so return to the top (the standalone page cannot scroll at all).
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);

      const expected = await capture(
        surface.locator("canvas"),
        browserName,
        testInfo.outputPath("preview.png"),
      );
      const actual = await capture(
        standalone.locator("canvas"),
        browserName,
        testInfo.outputPath("export.png"),
      );
      expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);

      const inset = 2;
      let total = 0;
      let worst = 0;
      let count = 0;
      let lit = 0;
      for (let y = inset; y < expected.height - inset; y++) {
        for (let x = inset; x < expected.width - inset; x++) {
          const i = (y * expected.width + x) * 4;
          for (let channel = 0; channel < 3; channel++) {
            const a = expected.data[i + channel] ?? 0;
            const b = actual.data[i + channel] ?? 0;
            const diff = Math.abs(a - b);
            total += diff;
            if (diff > worst) worst = diff;
            if (b > 24) lit += 1;
            count += 1;
          }
        }
      }
      // The export actually drew something, and it matches the preview.
      expect(lit / count).toBeGreaterThan(0.02);
      expect(total / count).toBeLessThan(1);
      expect(worst).toBeLessThanOrEqual(8);
    });
  }
});
