import { defineConfig, devices } from "@playwright/test";

import { loadTestEnv } from "./scripts/load-test-env.mjs";

loadTestEnv();

const baseURL = process.env.BASE_URL || "http://127.0.0.1:3001";

export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/unit/**", "**/integration/**", "**/manual/**"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      use: {
        ...devices["Desktop Chrome"],
      },
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium-auth",
      dependencies: ["setup"],
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
      // REST layer directly. Exercises the RPC and RLS security regression tests.
      name: "api-security",
      use: {
        storageState: { cookies: [], origins: [] },
      },
      testMatch: /(?:rpc-security|rls-isolation)\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3001",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180 * 1000,
  },
});
