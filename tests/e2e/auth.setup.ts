import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test as setup } from "@playwright/test";
import { createAccount } from "./account";

/**
 * Creates one account through the real sign-up flow and saves its session,
 * so tests that copy code run signed in (see `storageState` in
 * playwright.config.ts). Needs the dev server's embedded database and its
 * development outbox (.data/outbox), so it runs against `npm run dev`.
 */
const SIGNED_IN = path.join(process.cwd(), "tests", "e2e", ".auth", "user.json");

setup("create a signed-in account", async ({ page }) => {
  mkdirSync(path.dirname(SIGNED_IN), { recursive: true });
  await createAccount(page);
  await expect(page.getByTestId("header-account")).toHaveText("Account");
  await page.context().storageState({ path: SIGNED_IN });
});
