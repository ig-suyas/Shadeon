// Photographs site pages for design review, at desktop and phone width, in
// both themes:
//   node scripts/shoot-pages.mjs <name> <home,shaders,pricing,...> [--full] [--motion]
// writes .shots/<name>/<slug>-<width>-<theme>.png.
// SHOOT_URL picks the server (default http://localhost:3000). Reduced motion is
// on unless --motion is passed, so shots are repeatable; --full captures the
// whole page instead of the first screen.
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const [name = "pages", paths = "/"] = args.filter((a) => !a.startsWith("--"));
const base = process.env.SHOOT_URL ?? "http://localhost:3000";
const out = resolve(process.cwd(), ".shots", name);
mkdirSync(out, { recursive: true });

const sizes = [
  { label: "1440", width: 1440, height: 900, mobile: false },
  { label: "390", width: 390, height: 844, mobile: true },
];
const themes = ["dark", "light"];

const browser = await chromium.launch();
// Paths may be given without the leading slash ("home" means "/"), because Git
// Bash on Windows rewrites arguments that start with one into file paths.
for (const raw of paths.split(",")) {
  const path = raw === "home" || raw === "/" ? "/" : `/${raw.replace(/^\//, "")}`;
  const slug = path === "/" ? "home" : path.slice(1).replace(/[/?&=]+/g, "_");
  for (const size of sizes) {
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: size.mobile ? 2 : 1,
        isMobile: size.mobile,
        hasTouch: size.mobile,
        colorScheme: theme,
        reducedMotion: flags.has("--motion") ? "no-preference" : "reduce",
      });
      const page = await context.newPage();
      await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
      // Let live shaders replace their posters and finish the cross-fade.
      await page
        .waitForFunction(
          () =>
            [...document.querySelectorAll("[data-shader]")]
              .filter((el) => el.getBoundingClientRect().top < innerHeight)
              .every((el) => el.getAttribute("data-status") !== "poster"),
          undefined,
          { timeout: 15_000 },
        )
        .catch(() => {});
      await page.waitForTimeout(1200);
      const file = resolve(out, `${slug}-${size.label}-${theme}.png`);
      await page.screenshot({ path: file, fullPage: flags.has("--full") });
      console.log(file);
      await context.close();
    }
  }
}
await browser.close();
