// Manual debugging helper.
// This file is intentionally ignored by Playwright because it does not use the
// standard .spec.ts / .test.ts naming for automated test runs.
import { test } from "@playwright/test";

test("debug: check dashboard URL without auth", async ({ page }) => {
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  console.log("Final URL:", page.url());
  console.log("Page title:", await page.title());
  const bodyText = await page.locator("body").innerText();
  console.log("Body contains:", bodyText.substring(0, 200));
});
