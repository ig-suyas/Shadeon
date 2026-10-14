import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

/** A password that meets the rules; only ever used for throwaway test accounts. */
export const TEST_PASSWORD = "a quiet test passphrase 7";

export const uniqueEmail = (): string =>
  `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

/** Each test run looks like its own network, so the per-IP sign-up limit never trips. */
export async function ownNetwork(page: Page): Promise<void> {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
  });
}

/**
 * The latest development email for an address (src/server/mail.ts writes it
 * to .data/outbox when no email provider is configured). Returns its links as
 * paths on the server under test.
 */
export async function latestMailLinks(email: string, kind: string): Promise<string[]> {
  const file = path.join(
    process.cwd(),
    ".data",
    "outbox",
    `${createHash("sha256").update(email).digest("hex").slice(0, 24)}.json`,
  );
  let links: string[] = [];
  await expect
    .poll(
      () => {
        try {
          const mail = JSON.parse(readFileSync(file, "utf8")) as { kind: string; links: string[] };
          links = mail.kind === kind ? mail.links : [];
        } catch {
          links = [];
        }
        return links.length;
      },
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0);
  return links.map((link) => {
    const url = new URL(link);
    return `${url.pathname}${url.search}`;
  });
}

/** Signs up through the form, confirms through the emailed link, and ends signed in. */
export async function createAccount(page: Page, email = uniqueEmail()): Promise<string> {
  await ownNetwork(page);
  await page.goto("/signup");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("checkbox").check();
  // The form ignores submissions faster than a person could type.
  await page.waitForTimeout(1600);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("Check your inbox");

  const [confirm] = await latestMailLinks(email, "signup");
  expect(confirm).toMatch(/^\/verify-email\?token=/);
  await page.goto(confirm!);
  await page.getByRole("button", { name: "Confirm my email" }).click();
  await page.waitForURL("**/shaders");
  return email;
}
