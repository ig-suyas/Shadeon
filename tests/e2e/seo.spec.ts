import { expect, test } from "@playwright/test";
import { SHADER_IDS } from "../../src/shaders/ids";

/** Files and tags for search engines and link previews, plus the security headers. */
test.describe("search and sharing", () => {
  // Plain HTTP checks; one browser project is enough.
  test.skip(({ isMobile }) => isMobile, "no rendering involved");

  test("robots.txt allows the site and hides private paths", async ({ request }) => {
    const text = await (await request.get("/robots.txt")).text();
    expect(text).toContain("Allow: /");
    for (const path of ["/waitlist/", "/api/", "/dev/"])
      expect(text).toContain(`Disallow: ${path}`);
    expect(text).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
  });

  test("the sitemap lists every public page and every shader", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]!);
    expect(urls.some((url) => url.endsWith("/shaders/pointer-glow"))).toBe(true);
    expect(urls.some((url) => url.endsWith("/pricing"))).toBe(true);
    expect(urls.filter((url) => /\/shaders\/[a-z-]+$/.test(url)).length).toBe(SHADER_IDS.length);
    expect(urls.some((url) => /\/(dev|waitlist|api)\//.test(url))).toBe(false);
  });

  test("share images are PNGs of the right size", async ({ request }) => {
    for (const path of ["/opengraph-image", "/shaders/pointer-glow/opengraph-image"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
      const png = await response.body();
      // Width and height sit at bytes 16-23 of the PNG header.
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    }
  });

  test("a shader page has share tags and valid structured data", async ({ page }) => {
    await page.goto("/shaders/pointer-glow");
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
      "content",
      /\/shaders\/pointer-glow\/opengraph-image/,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
    const json = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(json ?? "{}") as Record<string, unknown>;
    expect(data["@type"]).toBe("SoftwareSourceCode");
    expect(data.name).toBe("Pointer Glow shader");
    expect(data.license).toBe("https://opensource.org/licenses/MIT");
  });

  test("every page carries the security headers", async ({ request }) => {
    for (const path of ["/", "/shaders/pointer-glow", "/pricing"]) {
      const headers = (await request.get(path)).headers();
      expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
      expect(headers["x-content-type-options"], path).toBe("nosniff");
      expect(headers["strict-transport-security"], path).toContain("max-age=");
      expect(headers["x-powered-by"], path).toBeUndefined();
    }
  });
});
