// Photographs the development review sheet so shaders can be judged by eye
// without an open browser window:
//   node scripts/shoot.mjs <name> <id,id,...> [time-offset-seconds]
// writes .shots/<name>.png (one row per shader, one tile per preset).
// Needs the dev server on http://localhost:3000. Reduced motion is switched on,
// so every tile shows the shader's still frame and shots are repeatable.
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const [name = "sheet", ids = ""] = process.argv.slice(2);
const base = process.env.SHOOT_URL ?? "http://localhost:3000";
const out = resolve(process.cwd(), ".shots");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  reducedMotion: "reduce",
});
await page.goto(`${base}/dev/review${ids ? `?ids=${ids}` : ""}`);
await page.waitForSelector("[data-testid=review-sheet] [data-shader]");
// The server renders every shader; the client narrows to `ids` after hydration.
await page.waitForLoadState("networkidle");
// Bring every tile into view once so each one loads, then wait for all to go live.
const tiles = page.locator("[data-testid=review-sheet] [data-shader]");
const count = await tiles.count();
// Scroll from inside the page: the sheet can re-render after hydration, which
// detaches element handles held by Playwright.
for (let i = 0; i < count; i++) {
  await page.evaluate((index) => {
    document
      .querySelectorAll("[data-testid=review-sheet] [data-shader]")
      [index]?.scrollIntoView({ block: "center" });
  }, i);
  await page.waitForTimeout(50);
}
await page.waitForFunction(
  () =>
    [...document.querySelectorAll("[data-testid=review-sheet] [data-shader]")].every(
      (tile) => tile.getAttribute("data-status") !== "poster",
    ),
  undefined,
  { timeout: 60_000 },
);
await page.waitForTimeout(900); // poster cross-fade
const failed = await page
  .locator('[data-testid=review-sheet] [data-shader][data-status="unsupported"]')
  .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-shader")));
const file = resolve(out, `${name}.png`);
await page.locator("[data-testid=review-sheet]").screenshot({ path: file });
await browser.close();
console.log(
  `${file} (${count} tiles${failed.length ? `, FAILED: ${[...new Set(failed)].join(", ")}` : ""})`,
);
