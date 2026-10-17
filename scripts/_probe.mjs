import { chromium } from "@playwright/test";
const q = process.argv[2] ?? "";
const browser = await chromium.launch({
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1020, height: 576 }, colorScheme: "dark" });
const logs = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") logs.push(m.text().slice(0, 200));
});
await page.goto("http://localhost:3001/dev/studio?id=black-hole" + q);
await page
  .waitForSelector('[data-shader="black-hole"][data-status="live"]', { timeout: 90000 })
  .catch(() => logs.push("not live"));
await page.waitForTimeout(1500);
await page.screenshot({ path: ".shots/black-hole.png" }).catch(() => logs.push("capture failed"));
console.log(logs.join("\n") || "console clean");
await browser.close();
