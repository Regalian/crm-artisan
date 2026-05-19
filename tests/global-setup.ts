import { chromium } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_EMAIL = `pw-test-${process.env.TEST_RUN_ID || Date.now()}@example.com`;
const TEST_PASSWORD = "playwright123!";

async function waitForServer(maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/login`);
      if (res.status === 200) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Dev server not ready at ${BASE_URL} after 30s`);
}

async function globalSetup() {
  await waitForServer();

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Sign up — with email confirmation disabled (dev), this auto-authenticates.
  await page.goto(`${BASE_URL}/signup`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByLabel("Confirm Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();

  // After signup the action redirects to /login?registered=true.
  // With auto-auth (dev), the proxy bounces /login → /dashboard.
  // So we just wait for dashboard to appear.
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  } catch {
    // If we never reach dashboard, email confirmation is enabled (prod).
    // We'll be on /login — need to log in manually.
    // But first check: do we have a session cookie?
    const cookies = await context.cookies();
    const hasSession = cookies.some((c) => c.name.includes("auth-token"));

    if (hasSession) {
      // Has session but not on dashboard — proxy might be slow. Force navigate.
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    } else {
      // No session, on /login — log in manually
      await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
      await page.locator("#login-email").waitFor({ state: "visible", timeout: 10000 });
      await page.locator("#login-email").fill(TEST_EMAIL);
      await page.locator("#login-password").fill(TEST_PASSWORD);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    }
  }

  // Save authenticated state
  await context.storageState({ path: "tests/auth.json" });

  await browser.close();
}

export default globalSetup;
