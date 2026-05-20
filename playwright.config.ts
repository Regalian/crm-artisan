import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  globalSetup: "./tests/global-setup.ts",
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-auth",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/auth.json",
      },
      testMatch: /clients\.spec\.ts|quotes\.spec\.ts/,
    },
    {
      name: "chromium-no-auth",
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: /auth\.spec\.ts/,
    },
    {
      name: "chromium-security",
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: /authorization\.spec\.ts/,
    },
    {
      // API-only project: no browser launched, calls Supabase and the app
      // REST layer directly.  Exercises the RPC security regression tests.
      name: "api-security",
      use: {
        storageState: { cookies: [], origins: [] },
      },
      testMatch: /rpc-security\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
