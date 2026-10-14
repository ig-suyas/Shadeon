import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

// Created by tests/e2e/auth.setup.ts: a real account's session, so the tests
// that copy code run signed in. tests/e2e/auth.spec.ts starts signed out.
const signedIn = "tests/e2e/.auth/user.json";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  // Shader tests render WebGL in software; more workers than this starve each other.
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["clipboard-read", "clipboard-write"],
        storageState: signedIn,
      },
    },
    {
      name: "mobile",
      dependencies: ["setup"],
      use: {
        ...devices["Pixel 7"],
        permissions: ["clipboard-read", "clipboard-write"],
        storageState: signedIn,
      },
    },
    // Firefox and WebKit (Safari's engine) run when E2E_ALL_BROWSERS=1. They
    // need `npx playwright install firefox webkit` first. Clipboard permissions
    // are Chromium-only, so copy tests read the confirmation, not the clipboard.
    ...(process.env.E2E_ALL_BROWSERS === "1"
      ? [
          {
            name: "firefox",
            dependencies: ["setup"],
            use: { ...devices["Desktop Firefox"], storageState: signedIn },
          },
          {
            name: "webkit",
            dependencies: ["setup"],
            use: { ...devices["Desktop Safari"], storageState: signedIn },
          },
          {
            name: "mobile-safari",
            dependencies: ["setup"],
            use: { ...devices["iPhone 13"], storageState: signedIn },
          },
        ]
      : []),
  ],
  // Locally this reuses a dev server that is already running. CI builds and serves production.
  webServer: {
    command: process.env.CI ? "npm run build && npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
