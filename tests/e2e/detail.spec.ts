import { expect, test, type Locator, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import { shaders } from "../../src/shaders/registry";

// Every shader in the catalog gets the export-vs-preview pixel comparison.
const SHADERS = shaders.map((shader) => shader.id);

function preview(page: Page): Locator {
  return page.locator("[data-testid=detail-preview] [data-shader]");
}

test.describe("shader page", () => {
  test("shows the shader, the controls and a Code button under the preview", async ({ page }) => {
    await page.goto("/shaders/mesh-drift");
    await expect(page.getByRole("heading", { level: 1, name: "Mesh Drift" })).toBeVisible();
    await expect(page.getByTestId("detail-code")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Customize" })).toBeVisible();
    await expect(page.getByRole("slider", { name: "Speed" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Props" })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "colors" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Related shaders" })).toBeVisible();
  });

  test("an unknown shader shows the not-found page and is not indexable", async ({ page }) => {
    await page.goto("/shaders/does-not-exist");
    await expect(page.getByText("This page could not be found.")).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
    await expect(page.getByRole("heading", { name: "Customize" })).toHaveCount(0);
  });

  test("the code updates live as controls change", async ({ page }) => {
    await page.goto("/shaders/mesh-drift");
    const code = page.getByTestId("code-panel").getByRole("tabpanel");
    await expect(code).toContainText("speed = 1,");

    const speed = page.getByRole("slider", { name: "Speed" });
    await speed.focus();
    await speed.press("End");
    await expect(code).toContainText("speed = 3,");
    await expect(page).toHaveURL(/speed=3/);

    await page.getByRole("button", { name: "Lagoon" }).click();
    await expect(code).toContainText('"#7df9d0"');
    await expect(page.getByRole("button", { name: "Lagoon" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const hex = page.getByRole("textbox", { name: "Warm A", exact: true });
    await hex.fill("#123456");
    await expect(code).toContainText('"#123456"');
    await hex.fill("nope");
    await expect(page.getByText("Use a hex colour like #1a2b3c.")).toBeVisible();
    await expect(code).toContainText('"#123456"');
  });

  test("randomize changes the settings and reset restores the defaults", async ({ page }) => {
    await page.goto("/shaders/aurora-veil");
    const reset = page.getByRole("button", { name: "Reset" });
    await expect(reset).toBeDisabled();
    await page.getByRole("button", { name: "Randomize" }).click();
    await expect(page).toHaveURL(/[?&]c=/);
    await expect(reset).toBeEnabled();
    await reset.click();
    await expect(page).toHaveURL(/\/shaders\/aurora-veil$/);
    await expect(reset).toBeDisabled();
  });

  test("a shared link restores the tuned settings", async ({ page }) => {
    await page.goto("/shaders/contour-field?c=0a2a66-3f6fc4-eaf2ff&levels=28&intensity=0.8");
    await expect(page.getByRole("button", { name: "Blueprint" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("slider", { name: "Levels" })).toHaveValue("28");
    await expect(page.getByTestId("code-panel").getByRole("tabpanel")).toContainText(
      "levels = 28,",
    );
  });

  test("hostile query values are ignored", async ({ page }) => {
    await page.goto(
      "/shaders/mesh-drift?c=%3Cscript%3E-zzzzzz&speed=1e999&scale=%22%3E%3Cimg%20src=x%20onerror=alert(1)%3E",
    );
    await expect(page.getByRole("slider", { name: "Speed" })).toHaveValue("1");
    await expect(page.getByRole("textbox", { name: "Warm A", exact: true })).toHaveValue("#ff6b3d");
    expect(await page.locator("img[src=x]").count()).toBe(0);
  });

  test("the viewer's Customize link carries the chosen preset to the shader page", async ({
    page,
  }) => {
    await page.goto("/shaders?s=mesh-drift");
    const dialog = page.getByTestId("shader-viewer");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Orchid" }).click();
    await dialog.getByTestId("viewer-customize").click();
    await expect(page).toHaveURL(/\/shaders\/mesh-drift\?c=ff8fd0/);
    await expect(page.getByRole("button", { name: "Orchid" })).toHaveAttribute(
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
test.describe("exported code matches the preview", () => {
  test.use({ reducedMotion: "reduce" });

  for (const id of SHADERS) {
    test(id, async ({ page, context, isMobile }, testInfo) => {
      test.skip(isMobile, "one pixel comparison per shader is enough");
      await page.setViewportSize({ width: 1280, height: 900 });
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
      const code = await page.evaluate(() => navigator.clipboard.readText());
      expect(code).toContain("mountShader(canvas, fragment");

      const standalone = await context.newPage();
      await standalone.setViewportSize({ width: 1280, height: 900 });
      await standalone.setContent(
        `<!doctype html><html><body style="margin:0;background:#000">
          <div style="width:${width}px;height:${height}px">
            <canvas id="${id}" style="display:block;width:100%;height:100%"></canvas>
          </div>
          <script type="module">${code}</script>
        </body></html>`,
      );
      await standalone.waitForTimeout(1200);

      // Copying scrolled the page to the code panel. Scroll-reactive shaders read the
      // scroll position, so return to the top (the standalone page cannot scroll at all).
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);

      const expected = PNG.sync.read(
        await surface.locator("canvas").screenshot({ path: testInfo.outputPath("preview.png") }),
      );
      const actual = PNG.sync.read(
        await standalone.locator("canvas").screenshot({ path: testInfo.outputPath("export.png") }),
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
