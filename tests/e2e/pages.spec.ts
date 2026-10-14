import { readCopied, recordClipboard } from "./clipboard";
import { expect, test, type Page } from "@playwright/test";

/**
 * Tests that save something need a database. The dev server has an embedded
 * one; a production build needs DATABASE_URL. Set E2E_NO_STORAGE=1 to skip
 * them when testing a production build without a database.
 */
const noStorage = process.env.E2E_NO_STORAGE === "1";

const unique = (): string => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

test.describe("supporting pages", () => {
  for (const [path, heading] of [
    ["/docs", "Docs"],
    ["/pricing", "Free today. Pro later."],
    ["/about", "About Shadeon"],
    ["/changelog", "Changelog and roadmap"],
    ["/request", "Request a shader"],
    ["/contact", "Contact"],
  ] as const) {
    test(`${path} renders with one h1 and no horizontal overflow`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("header and footer links all lead to real pages", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page
      .locator("header a[href^='/'], footer a[href^='/']")
      .evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute("href") ?? ""))]);
    expect(hrefs.length).toBeGreaterThan(6);
    for (const href of hrefs) {
      const response = await request.get(href);
      expect(response.status(), href).toBe(200);
    }
  });

  test("an unknown address shows the 404 page with a way back", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "This page could not be found.",
    );
    await expect(page.locator("main").getByRole("link", { name: "Browse shaders" })).toBeVisible();
  });

  test("docs code samples are highlighted and copyable", async ({ page, browserName }) => {
    await recordClipboard(page, browserName);
    await page.goto("/docs");
    await expect(page.locator(".shiki").first()).toBeVisible();
    await page.getByRole("button", { name: "Copy Terminal" }).click();
    const copied = await readCopied(page, browserName);
    expect(copied).toMatch(/^npx shadcn@latest add https?:\/\/.+\/r\/mesh-drift\.json$/);
  });
});

/**
 * Forms are rate limited per client address. Locally there is no proxy, so each
 * test presents its own address and the limits do not leak between tests.
 */
async function useFreshAddress(page: Page): Promise<void> {
  const part = (): number => 1 + Math.floor(Math.random() * 250);
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.${part()}.${part()}.${part()}` });
}

test.describe("waitlist form", () => {
  test.beforeEach(async ({ page }) => useFreshAddress(page));

  test("joins with a valid email and consent", async ({ page }) => {
    test.skip(noStorage, "needs a database");
    await page.goto("/pricing");
    await page.getByLabel("Email address").fill(unique());
    await page.getByLabel("Email me once when Shadeon Pro is available.").check();
    await page.waitForTimeout(1600); // faster than this is treated as automated
    await page.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Check your inbox" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Join the waitlist" })).toHaveCount(0);
  });

  test("gives the same answer for an address that is already on the list", async ({ page }) => {
    test.skip(noStorage, "needs a database");
    const email = unique();
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.goto("/pricing");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Email me once when Shadeon Pro is available.").check();
      await page.waitForTimeout(1600);
      await page.getByRole("button", { name: "Join the waitlist" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Check your inbox" })).toBeVisible();
    }
  });

  test("the server rejects an address the browser lets through, and keeps what was typed", async ({
    page,
  }) => {
    await page.goto("/pricing");
    const email = page.getByLabel("Email address");
    await email.fill("someone@localhost"); // valid for the browser, not for us
    await page.getByLabel("Email me once when Shadeon Pro is available.").check();
    await page.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "Please fix the highlighted fields.",
    );
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(email).toHaveValue("someone@localhost");
    await expect(email).toHaveAttribute("aria-invalid", "true");
  });

  test("requires the consent box", async ({ page }) => {
    await page.goto("/pricing");
    await page.getByLabel("Email address").fill(unique());
    await page.getByRole("button", { name: "Join the waitlist" }).click();
    // Native validation stops the submit; nothing is sent.
    await expect(page.getByRole("status").filter({ hasText: "Check your inbox" })).toHaveCount(0);
    const valid = await page
      .getByLabel("Email me once when Shadeon Pro is available.")
      .evaluate((input: HTMLInputElement) => input.validity.valid);
    expect(valid).toBe(false);
  });

  test("a made-up token cannot confirm or remove anyone", async ({ page }) => {
    test.skip(noStorage, "needs a database");
    for (const path of ["/waitlist/confirm", "/waitlist/unsubscribe"]) {
      await page.goto(`${path}?token=${"A".repeat(43)}`);
      await page.locator("main").getByRole("button").click();
      await expect(page.locator("main").getByRole("alert")).toContainText(
        "This link is not valid any more.",
      );
    }
  });

  test("without a token the button is disabled", async ({ page }) => {
    await page.goto("/waitlist/confirm");
    await expect(page.getByRole("button", { name: "Confirm my email" })).toBeDisabled();
  });
});

test.describe("request and contact forms", () => {
  test.beforeEach(async ({ page }) => useFreshAddress(page));

  test("a shader request is accepted", async ({ page }) => {
    test.skip(noStorage, "needs a database");
    await page.goto("/request");
    await page.getByLabel("What should it be called?").fill("Caustics");
    await page
      .getByLabel("Describe the look")
      .fill("Light through water on a pool floor, slow and blue.");
    await page.waitForTimeout(1600);
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Thank you" })).toBeVisible();
  });

  test("a request with a bad link is rejected on the server and keeps the text", async ({
    page,
  }) => {
    await page.goto("/request");
    await page.getByLabel("What should it be called?").fill("Ink");
    const details = page.getByLabel("Describe the look");
    await details.fill("Ink spreading in water, slowly.");
    await page.getByLabel(/Reference link/).fill("ftp://example.com/picture");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Enter a full link starting with https://")).toBeVisible();
    await expect(details).toHaveValue("Ink spreading in water, slowly.");
  });

  test("a contact message is accepted", async ({ page }) => {
    test.skip(noStorage, "needs a database");
    await page.goto("/contact");
    await page.getByLabel("Topic").selectOption("feedback");
    await page.getByLabel("Message").fill("The gallery works well on my phone. Thank you.");
    await page.waitForTimeout(1600);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Thank you" })).toBeVisible();
  });

  test("too many submissions from one address are refused", async ({ page }) => {
    test.skip(noStorage, "needs a database");
    test.setTimeout(90_000);
    let refused = false;
    for (let attempt = 0; attempt < 7 && !refused; attempt++) {
      await page.goto("/contact");
      await page.getByLabel("Topic").selectOption("other");
      await page.getByLabel("Message").fill(`Rate limit check, attempt ${attempt}.`);
      await page.waitForTimeout(1600);
      await page.getByRole("button", { name: "Send message" }).click();
      const outcome = page
        .locator("main")
        .getByRole("status")
        .filter({ hasText: "Thank you" })
        .or(page.locator("main").getByRole("alert"));
      await expect(outcome.first()).toBeVisible();
      refused = (await page.locator("main").getByRole("alert").count()) > 0;
    }
    expect(refused).toBe(true);
    await expect(page.locator("main").getByRole("alert")).toContainText("Too many attempts");
  });

  test("the hidden trap field is not reachable by keyboard or screen reader", async ({ page }) => {
    await page.goto("/contact");
    const trap = page.locator('input[name="website"]');
    await expect(trap).toHaveAttribute("tabindex", "-1");
    expect(await trap.evaluate((input) => input.closest("[aria-hidden=true]") !== null)).toBe(true);
  });
});
