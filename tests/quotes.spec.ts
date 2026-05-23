import { test, expect } from "@playwright/test";

import { createClientViaUi, createJobSiteViaUi, deleteClientsMatching } from "./helpers/ui-flows";

test.describe("Quote Lifecycle", () => {
  test.describe.configure({ mode: "serial" });
  const uniqueId = `pw-${Date.now()}`;
  const TEST_CLIENT = {
    name: `PW Quote Client ${uniqueId}`,
    phone: "07700 900111",
    email: "quotetest@example.com",
    address: "456 Test Avenue",
  };
  const TEST_JOB_SITE = {
    title: `PW Test Site ${uniqueId}`,
    address: "789 Job Road",
  };
  const LINE_ITEMS = [
    { description: "Copper pipe 15mm (per metre)", quantity: "10", unit_price: "4.50" },
    { description: "Solder ring elbows 15mm", quantity: "20", unit_price: "1.25" },
    { description: "Labour - installation", quantity: "8", unit_price: "45.00" },
  ];

  test.afterAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      storageState: testInfo.project.use.storageState,
    });
    const page = await context.newPage();

    try {
      await page.setViewportSize({ width: 1280, height: 720 });
      await deleteClientsMatching(page, "PW Quote Client pw-");
    } finally {
      await context.close();
    }
  });

  test("full quote lifecycle: create client, job site, quote with line items, send, PDF", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // --- STEP 1: CREATE A CLIENT ---
    await createClientViaUi(page, TEST_CLIENT);

    // --- STEP 2: CREATE A JOB SITE ---
    const jobSiteRow = await createJobSiteViaUi(page, {
      clientName: TEST_CLIENT.name,
      title: TEST_JOB_SITE.title,
      address: TEST_JOB_SITE.address,
    });

    // --- STEP 3: CREATE A QUOTE WITH 3 LINE ITEMS ---
    await jobSiteRow.locator("button[aria-label='Create quote']").click();
    await expect(page.getByRole("heading", { name: /new quote/i })).toBeVisible({ timeout: 5000 });

    // Add 3 line items
    for (let i = 0; i < LINE_ITEMS.length; i++) {
      await page.getByRole("button", { name: /add item/i }).click();
    }

    // Fill each line item using label-based locators in nth order
    for (let i = 0; i < LINE_ITEMS.length; i++) {
      const item = LINE_ITEMS[i];

      await page.getByLabel("Description").nth(i).fill(item.description);
      await page.getByLabel("Qty").nth(i).fill(item.quantity);
      await page.getByLabel("Unit Price (£)").nth(i).fill(item.unit_price);
    }

    // Verify the live total: 10×4.50 + 20×1.25 + 8×45.00 = £430.00
    await expect(page.getByText("£430.00")).toBeVisible({ timeout: 5000 });

    // Save as draft — wait for navigation to the quote detail page
    await page.getByRole("button", { name: /save as draft/i }).click();

    // Navigate happens after save; wait for the quote detail page
    const quoteHeading = page.getByRole("heading", { level: 1, name: /^Q-\d{3}$/ });
    await expect(quoteHeading).toBeVisible({ timeout: 15000 });

    // Verify quote number format Q-NNN
    const quoteNumberText = await quoteHeading.textContent();
    expect(quoteNumberText).toMatch(/^Q-\d{3}$/);

    // Verify 3 line items in the read-only table
    const lineItemRows = page.getByRole("row").filter({ has: page.getByRole("cell") });
    await expect(lineItemRows).toHaveCount(3, { timeout: 5000 });

    // Verify the last row's line total and the grand total
    const lastRow = lineItemRows.last();
    await expect(lastRow.getByRole("cell").last()).toContainText("£360.00");
    await expect(page.getByText("£430.00").last()).toBeVisible();

    // Verify status badge shows "Draft"
    await expect(page.getByText("Draft")).toBeVisible();

    // --- STEP 4: CHANGE STATUS TO "SENT" ---
    await page.getByRole("button", { name: /send quote/i }).click();
    await expect(page.getByRole("heading", { name: /send quote\?/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /^send$/i }).click();

    // Verify status changed to Sent
    await expect(page.getByText("Sent")).toBeVisible({ timeout: 5000 });

    // Send button should no longer be visible (quote is now read-only)
    await expect(page.getByRole("button", { name: /send quote/i })).not.toBeVisible();

    // Edit button should also be gone
    await expect(page.getByRole("button", { name: /edit quote/i })).not.toBeVisible();

    // Revert button should now be available
    await expect(page.getByRole("button", { name: /revert to draft/i })).toBeVisible();

    // --- STEP 5: GENERATE PDF ---
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: /download pdf/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/Q-\d{3}\.pdf$/);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
  });

});
