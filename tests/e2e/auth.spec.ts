import { expect, test, type Page } from "@playwright/test";
import { createAccount, latestMailLinks, ownNetwork, TEST_PASSWORD, uniqueEmail } from "./account";

// Every test here starts signed out, whatever the project's default session.
test.use({ storageState: { cookies: [], origins: [] } });

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function signOut(page: Page): Promise<void> {
  await page.goto("/account");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByTestId("header-account")).toHaveText("Sign in");
}

test.describe("signed out", () => {
  test("the design is open to everyone; the code is not", async ({ page }) => {
    await page.goto("/shaders/mesh-drift");
    await expect(page.getByRole("heading", { level: 1, name: "Mesh Drift" })).toBeVisible();
    await expect(page.locator("[data-testid=detail-preview] [data-shader]")).toBeVisible();
    await expect(page.getByRole("slider", { name: "Speed" })).toBeVisible();

    const panel = page.getByTestId("code-panel");
    await expect(panel.getByText("Sign in to get the code")).toBeVisible();
    await expect(panel).not.toContainText("use client");
    await expect(panel).not.toContainText("npx shadcn");
    await expect(page.getByTestId("header-account")).toHaveText("Sign in");

    await page.getByTestId("copy-sign-in").click();
    await expect(page).toHaveURL(/\/login\?next=%2Fshaders%2Fmesh-drift/);
  });

  test("the server refuses code without a session, whatever the page shows", async ({
    request,
  }) => {
    const code = await request.post("/api/code", { data: { id: "mesh-drift" } });
    expect(code.status()).toBe(401);
    expect(await code.text()).not.toContain("void main");

    const forged = await request.post("/api/code", {
      data: { id: "mesh-drift" },
      headers: { Cookie: `shadeon_session=${"A".repeat(43)}` },
    });
    expect(forged.status()).toBe(401);

    const crossSite = await request.post("/api/code", {
      data: { id: "mesh-drift" },
      headers: { Origin: "https://evil.example" },
    });
    expect(crossSite.status()).toBe(403);

    expect((await request.get("/r/mesh-drift.json")).status()).toBe(401);
    const index = await request.get("/r/index.json");
    expect(index.status()).toBe(200);
    expect(await index.text()).not.toContain("void main");
    expect((await request.get("/api/auth/session")).headers()["cache-control"]).toContain(
      "no-store",
    );
  });

  test("the account page sends signed-out visitors to sign in", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?next=\/account$/);
  });
});

test.describe("accounts", () => {
  test("sign up, get the code, sign out, sign back in, delete the account", async ({ page }) => {
    const email = await createAccount(page);
    await expect(page.getByTestId("header-account")).toHaveText("Account");

    // Signed in: the code and a personal install command appear.
    await page.goto("/shaders/mesh-drift");
    const panel = page.getByTestId("code-panel");
    await expect(panel.getByRole("tabpanel")).toContainText('"use client";');
    const install = (await panel.locator("code", { hasText: "npx shadcn" }).textContent()) ?? "";
    const link = /"(https?:\/\/[^"]+)"/.exec(install)?.[1];
    expect(link).toMatch(/\/r\/mesh-drift\.json\?token=/);
    const registry = await page.request.get(new URL(link!).pathname + new URL(link!).search);
    expect(registry.status()).toBe(200);
    expect(await registry.text()).toContain("components/shadeon/mesh-drift.tsx");

    await signOut(page);
    await page.goto("/shaders/mesh-drift");
    await expect(page.getByTestId("code-panel").getByText("Sign in to get the code")).toBeVisible();

    // Back to where they were after signing in.
    await page.getByTestId("copy-sign-in").click();
    await signIn(page, email, TEST_PASSWORD);
    await page.waitForURL("**/shaders/mesh-drift");

    await page.goto("/account");
    await expect(page.getByTestId("account-email")).toHaveText(email);
    await page.getByLabel("Your password").fill(TEST_PASSWORD);
    await page.getByLabel('Type "delete" to confirm').fill("delete");
    await page.getByRole("button", { name: "Delete my account" }).click();
    await page.waitForURL("**/account/deleted");
    await expect(page.getByTestId("header-account")).toHaveText("Sign in");

    // The account is gone: its password no longer works, and its install links stop.
    expect((await page.request.get(new URL(link!).pathname + new URL(link!).search)).status()).toBe(
      401,
    );
    await page.goto("/login");
    await signIn(page, email, TEST_PASSWORD);
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "Email or password is incorrect",
    );
  });

  test("a wrong password and an unknown address get the same answer", async ({ page }) => {
    await ownNetwork(page);
    const email = await createAccount(page);
    await signOut(page);

    await page.goto("/login");
    await signIn(page, email, "not the right password");
    const wrong = await page.locator("main").getByRole("alert").textContent();
    await page.goto("/login");
    await signIn(page, uniqueEmail(), "not the right password");
    const unknown = await page.locator("main").getByRole("alert").textContent();
    expect(wrong).toContain("Email or password is incorrect");
    expect(unknown).toBe(wrong);
  });

  test("signing up with a registered address reveals nothing on the page", async ({ page }) => {
    const email = await createAccount(page);
    await signOut(page);
    await page.goto("/signup");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("another long passphrase");
    await page.getByRole("checkbox").check();
    await page.waitForTimeout(1600);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.locator("main").getByRole("status")).toContainText("Check your inbox");
    // The owner is told by email instead.
    await latestMailLinks(email, "signup-existing");
  });

  test("password reset: link by email, new password works, old one does not", async ({ page }) => {
    const email = await createAccount(page);
    await signOut(page);

    await page.goto("/forgot-password");
    await page.getByLabel("Email address").fill(email);
    await page.waitForTimeout(1600);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.locator("main").getByRole("status")).toContainText("If an account uses");

    const [reset] = await latestMailLinks(email, "reset");
    await page.goto(reset!);
    const fresh = "a brand new passphrase 9";
    await page.getByLabel("New password", { exact: true }).fill(fresh);
    await page.getByLabel("New password again").fill(fresh);
    await page.getByRole("button", { name: "Change password" }).click();
    await page.waitForURL("**/account");
    await expect(page.getByTestId("account-email")).toHaveText(email);

    // The link worked once only.
    await page.goto(reset!);
    await page.getByLabel("New password", { exact: true }).fill("yet another passphrase");
    await page.getByLabel("New password again").fill("yet another passphrase");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("not valid any more");

    await signOut(page);
    await page.goto("/login");
    await signIn(page, email, TEST_PASSWORD);
    await expect(page.locator("main").getByRole("alert")).toContainText("incorrect");
    await page.goto("/login");
    await signIn(page, email, fresh);
    await page.waitForURL("**/shaders");
  });

  test("sign-in never redirects to another site", async ({ page }) => {
    const email = await createAccount(page);
    await signOut(page);
    await page.goto("/login?next=//evil.example/steal");
    await signIn(page, email, TEST_PASSWORD);
    await page.waitForURL("**/shaders");
    expect(new URL(page.url()).host).toBe(new URL(test.info().project.use.baseURL!).host);
  });
});
