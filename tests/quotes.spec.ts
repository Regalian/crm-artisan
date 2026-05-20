import { test, expect } from "@playwright/test";

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

  test("full quote lifecycle: create client, job site, quote with line items, send, PDF", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // --- STEP 1: CREATE A CLIENT ---
    await page.goto("/clients");
    await page.getByRole("button", { name: /add client/i }).click();
    await expect(page.locator("#name-desktop")).toBeVisible({ timeout: 5000 });

    await page.locator("#name-desktop").fill(TEST_CLIENT.name);
    await page.locator("#phone-desktop").fill(TEST_CLIENT.phone);
    await page.locator("#email-desktop").fill(TEST_CLIENT.email);
    await page.locator("#address-desktop").fill(TEST_CLIENT.address);
    await page.getByRole("button", { name: /create client/i }).click();

    await expect(page.getByText(/added successfully/i)).toBeVisible({ timeout: 5000 });

    const clientRow = page.locator("tbody tr").filter({ hasText: TEST_CLIENT.name });
    await expect(clientRow).toBeVisible();

    // --- STEP 2: CREATE A JOB SITE ---
    await page.goto("/job-sites");
    await page.getByRole("button", { name: /add job site/i }).click();
    await expect(page.locator("#title-desktop")).toBeVisible({ timeout: 5000 });

    await page.locator("#client-desktop").selectOption({ label: TEST_CLIENT.name });
    await page.locator("#title-desktop").fill(TEST_JOB_SITE.title);
    await page.locator("#address-desktop").fill(TEST_JOB_SITE.address);
    await page.getByRole("button", { name: /create job site/i }).click();

    await expect(page.getByText(/added successfully/i)).toBeVisible({ timeout: 5000 });

    const jobSiteRow = page.locator("tbody tr").filter({ hasText: TEST_JOB_SITE.title });
    await expect(jobSiteRow).toBeVisible();

    // --- STEP 3: CREATE A QUOTE WITH 3 LINE ITEMS ---
    await jobSiteRow.locator("button[aria-label='Create quote']").click();
    await expect(page.getByRole("heading", { name: /new quote/i })).toBeVisible({ timeout: 5000 });

    // Add 3 line items
    for (let i = 0; i < LINE_ITEMS.length; i++) {
      await page.getByRole("button", { name: /add item/i }).click();
    }

    // Fill each line item card (ordered by nth position)
    const cards = page.locator('div.rounded-lg.border:has(label:text("Description"))');

    for (let i = 0; i < LINE_ITEMS.length; i++) {
      const card = cards.nth(i);
      const item = LINE_ITEMS[i];

      await card.locator('input[type="text"]').fill(item.description);
      const numInputs = card.locator('input[type="number"]');
      await numInputs.nth(0).fill(item.quantity);
      await numInputs.nth(1).fill(item.unit_price);
    }

    // Verify the live total: 10×4.50 + 20×1.25 + 8×45.00 = £430.00
    await expect(page.getByText("£430.00")).toBeVisible({ timeout: 5000 });

    // Save as draft — wait for navigation to the quote detail page
    await page.getByRole("button", { name: /save as draft/i }).click();

    // Navigate happens after save; wait for the quote detail page
    await expect(page.locator('h1:has-text("Q-")').first()).toBeVisible({ timeout: 15000 });

    // Verify quote number format Q-NNN
    const quoteNumberText = await page.locator('h1:has-text("Q-")').first().textContent();
    expect(quoteNumberText).toMatch(/^Q-\d{3}$/);

    // Verify 3 line items in the read-only table
    await expect(page.locator('tbody tr.border-b')).toHaveCount(3, { timeout: 5000 });

    // Verify the last row's line total and the grand total
    const lastRow = page.locator('tbody tr.border-b').last();
    await expect(lastRow.locator('td').last()).toContainText("£360.00");
    await expect(page.locator('span:has-text("£430.00")').last()).toBeVisible();

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

  // --- CLEANUP ---
  test("cleanup: remove test client and descendants", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    const leftoverClients = page.locator("tbody tr").filter({ hasText: "PW Quote Client pw-" });
    const count = await leftoverClients.count();
    for (let i = 0; i < count; i++) {
      await leftoverClients.first().locator("button[aria-label='Delete client']").click();
      await page.getByRole("button", { name: /^delete$/i }).click();
      await page.waitForTimeout(500);
    }
  });
});
