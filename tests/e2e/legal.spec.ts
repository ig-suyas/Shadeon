import { expect, test } from "@playwright/test";

const pages = [
  ["/legal/license", "License"],
  ["/legal/terms", "Terms of use"],
  ["/legal/privacy", "Privacy policy"],
  ["/legal/cookies", "Cookie notice"],
] as const;

test.describe("legal pages", () => {
  for (const [path, heading] of pages) {
    test(`${path} renders, says it is a draft, and links to the others`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(page.getByRole("note")).toContainText("has not yet been reviewed by a lawyer");
      const nav = page.getByRole("navigation", { name: "Legal pages" });
      for (const [other] of pages) {
        await expect(nav.locator(`a[href="${other}"]`)).toBeVisible();
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("the license page contains the full MIT text", async ({ page }) => {
    await page.goto("/legal/license");
    const text = await page.locator("main pre").innerText();
    expect(text).toContain("MIT License");
    expect(text).toContain("Permission is hereby granted, free of charge");
    expect(text).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
  });

  test("the privacy policy names every processor and retention period", async ({ page }) => {
    await page.goto("/legal/privacy");
    const main = page.locator("main");
    for (const name of ["Vercel", "Neon", "Resend", "Upstash", "Cloudflare"]) {
      await expect(main.getByText(name, { exact: true }).first()).toBeVisible();
    }
    await expect(main).toContainText("30 days after the last confirmation email");
    await expect(main).toContainText("deleted after 24 months");
    await expect(main).toContainText("We do not store IP addresses in our database.");
  });

  test.describe("cookies", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("browsing sets no cookies", async ({ page, context }) => {
      for (const path of ["/", "/shaders", "/shaders/mesh-drift", "/pricing", "/legal/cookies"]) {
        await page.goto(path);
      }
      expect(await context.cookies()).toEqual([]);
    });
  });

  test("signing in sets only the session cookie, HttpOnly and SameSite=Lax", async ({
    context,
  }) => {
    // The project's signed-in state comes from tests/e2e/auth.setup.ts.
    const cookies = await context.cookies();
    expect(cookies.map((cookie) => cookie.name)).toEqual(["shadeon_session"]);
    expect(cookies[0]).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
  });

  test("forms link to the privacy policy", async ({ page }) => {
    for (const path of ["/pricing", "/request", "/contact"]) {
      await page.goto(path);
      await expect(page.locator('main form a[href="/legal/privacy"]')).toBeVisible();
    }
  });

  test("the retention job refuses requests without the secret", async ({ request }) => {
    expect((await request.get("/api/cron/purge")).status()).toBe(404);
    const wrong = await request.get("/api/cron/purge", {
      headers: { authorization: "Bearer not-the-secret-000000" },
    });
    expect(wrong.status()).toBe(404);
  });
});
