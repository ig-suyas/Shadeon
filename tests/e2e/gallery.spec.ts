import { readCopied, recordClipboard } from "./clipboard";
import { expect, test, type Page } from "@playwright/test";
import { shaders } from "../../src/shaders/registry";

const viewer = "[data-testid=shader-viewer]";

/** Opens the gallery and waits until the interactive grid has replaced the server fallback. */
async function openGallery(page: Page, path = "/shaders"): Promise<void> {
  await page.goto(path);
  await expect(page.getByTestId("result-count")).toBeVisible();
}

test.describe("gallery", () => {
  test("lists every shader with a visible Code button", async ({ page }) => {
    await openGallery(page);
    const cards = page.locator("[data-card]");
    await expect(cards).not.toHaveCount(0);
    const count = await cards.count();
    await expect(page.getByTestId("result-count")).toContainText(`${count} of ${count}`);
    // Visible without hover, on every card.
    for (const button of await page.getByTestId("card-code").all()) {
      await expect(button).toBeVisible();
    }
  });

  test("open a shader, open its code, switch tabs, copy", async ({ page, browserName }) => {
    await recordClipboard(page, browserName);
    await openGallery(page);
    await page.getByRole("link", { name: "Open Mesh Drift" }).click();

    const dialog = page.locator(viewer);
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/[?&]s=mesh-drift/);
    await expect(dialog.getByRole("heading", { name: "Mesh Drift" })).toBeVisible();

    // The Code button sits in the viewer's header, right above the shader.
    await dialog.getByTestId("viewer-code").click();
    await expect(page).toHaveURL(/code=react/);
    const panel = dialog.getByTestId("code-panel");
    await expect(panel.getByRole("tab", { name: "React TS" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(panel.getByRole("tabpanel")).toContainText("export function MeshDrift");
    await expect(panel).toContainText("npx shadcn@latest add");

    await panel.getByRole("tab", { name: "GLSL" }).click();
    await expect(page).toHaveURL(/code=glsl/);
    await expect(panel.getByRole("tabpanel")).toContainText("gl_FragColor");

    await panel.getByRole("tab", { name: "JavaScript" }).click();
    await expect(panel.getByRole("tabpanel")).toContainText("mountShader(canvas, fragment");

    await panel.getByRole("button", { name: "Copy code" }).click();
    await expect(panel.getByRole("status").first()).toHaveText("Copied to clipboard");
    const copied = await readCopied(page, browserName);
    expect(copied).toContain("const fragment = `");
    expect(copied).toContain("function mountShader(");
    // What was copied is exactly what the panel shows.
    const shown = await panel.getByRole("tabpanel").innerText();
    expect(copied.replace(/\s+/g, "")).toBe(shown.replace(/\s+/g, ""));
  });

  test("the card's Code button opens the viewer with code showing", async ({ page }) => {
    await openGallery(page);
    await page.getByRole("link", { name: "Get the code for Aurora Veil" }).click();
    await expect(page.locator(viewer)).toBeVisible();
    await expect(page).toHaveURL(/s=aurora-veil&code=react/);
    await expect(page.getByTestId("code-panel").getByRole("tabpanel")).toContainText(
      "export function AuroraVeil",
    );
  });

  test("Escape, the close button and Back all close the viewer", async ({ page }) => {
    await openGallery(page);
    const open = page.getByRole("link", { name: "Open Contour Field" });
    const dialog = page.locator(viewer);

    await open.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/shaders$/);

    await open.click();
    await dialog.getByTestId("viewer-close").click();
    await expect(dialog).toHaveCount(0);

    await open.click();
    await expect(dialog).toBeVisible();
    await page.goBack();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/shaders$/);
  });

  test("keyboard: focus is trapped, arrows step between shaders", async ({ page, isMobile }) => {
    test.skip(isMobile, "hardware keyboard flow");
    await openGallery(page);
    await page.getByRole("link", { name: "Open Mesh Drift" }).focus();
    await page.keyboard.press("Enter");
    const dialog = page.locator(viewer);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("viewer-code")).toBeFocused();

    // Tab many times: focus must never leave the dialog.
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(
        () =>
          document.activeElement?.closest("dialog") !== null ||
          document.activeElement === document.body,
      );
      expect(inside).toBe(true);
    }

    await dialog.getByTestId("viewer-code").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page).not.toHaveURL(/s=mesh-drift/);
    await expect(page).toHaveURL(/[?&]s=/);
    await expect(dialog.getByRole("heading", { level: 2 })).not.toHaveText("Mesh Drift");
    await dialog.getByTestId("viewer-code").focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(/s=mesh-drift/);
  });

  test("a deep link opens the shader and its code directly", async ({ page }) => {
    await openGallery(page, "/shaders?s=contour-field&code=glsl");
    const dialog = page.locator(viewer);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Contour Field" })).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "GLSL" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(dialog.getByRole("tabpanel")).toContainText("u_levels");
  });

  test("an unknown shader id in the URL is ignored", async ({ page }) => {
    await openGallery(page, "/shaders?s=does-not-exist&code=react");
    await expect(page.locator("[data-card]").first()).toBeVisible();
    await expect(page.locator(viewer)).toHaveCount(0);
  });

  test("search, category and tag filters narrow the grid and update the URL", async ({ page }) => {
    await openGallery(page);
    const cards = page.locator("[data-card]");
    const total = await cards.count();

    await page.getByRole("searchbox", { name: "Search shaders" }).fill("aurora");
    await expect(cards).toHaveCount(1);
    await expect(page).toHaveURL(/q=aurora/);
    await expect(page.getByTestId("result-count")).toContainText(`1 of ${total}`);

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(cards).toHaveCount(total);
    await expect(page.getByRole("searchbox", { name: "Search shaders" })).toHaveValue("");

    await page
      .getByRole("group", { name: "Category" })
      .getByRole("button", { name: "lines" })
      .click();
    await expect(page).toHaveURL(/cat=lines/);
    // Order follows DISPLAY_ORDER, which changes as shaders are added, so check
    // membership rather than position.
    await expect(page.locator('[data-card="contour-field"]')).toHaveCount(1);
    await expect(page.locator('[data-card="aurora-veil"]')).toHaveCount(0);

    await page.getByRole("searchbox", { name: "Search shaders" }).fill("zzzz-no-match");
    await expect(
      page.getByRole("heading", { name: "No shaders match those filters." }),
    ).toBeVisible();
  });

  test("filters in the URL are applied on load", async ({ page }) => {
    await openGallery(page, "/shaders?tag=pointer&sort=name");
    const ids = await page
      .locator("[data-card]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-card")));
    // Whatever the catalog holds: every shader tagged "pointer", in name order.
    const expected = shaders
      .filter((shader) => shader.tags.includes("pointer"))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((shader) => shader.id);
    expect(expected.length).toBeGreaterThan(0);
    expect(ids).toEqual(expected);
  });

  test("swipe down closes the viewer on touch screens", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch gesture");
    await openGallery(page);
    await page.getByRole("link", { name: "Open Mesh Drift" }).tap();
    const dialog = page.locator(viewer);
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(500); // let the open animation finish

    const header = dialog.locator("header");
    const box = await header.boundingBox();
    if (!box) throw new Error("viewer header has no box");
    const x = box.x + 60;
    const y = box.y + box.height / 2;
    const pointer = { pointerId: 7, pointerType: "touch", isPrimary: true, bubbles: true };
    await header.dispatchEvent("pointerdown", { ...pointer, clientX: x, clientY: y });
    for (let step = 1; step <= 8; step++) {
      await header.dispatchEvent("pointermove", { ...pointer, clientX: x, clientY: y + step * 30 });
    }
    await header.dispatchEvent("pointerup", { ...pointer, clientX: x, clientY: y + 240 });
    await expect(dialog).toHaveCount(0);
  });
});

test.describe("landing", () => {
  test("hero shows the headline and both actions above the fold", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Animated shaders, ready to paste.",
    );
    const browse = page.locator("main").getByRole("link", { name: "Browse shaders" }).first();
    const copy = page.getByRole("button", { name: "Copy a shader" });
    await expect(browse).toBeInViewport();
    await expect(copy).toBeInViewport();
  });

  test("Copy a shader puts a complete React component on the clipboard", async ({
    page,
    browserName,
  }) => {
    await recordClipboard(page, browserName);
    await page.goto("/");
    await page.getByRole("button", { name: "Copy a shader" }).click();
    await expect(page.getByRole("status").first()).toHaveText("Copied to clipboard");
    const copied = await readCopied(page, browserName);
    expect(copied).toContain('"use client";');
    expect(copied).toContain("export function MeshDrift");
  });
});
