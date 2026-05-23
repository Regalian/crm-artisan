import { test, expect } from "@playwright/test";

import { createClientViaUi, deleteClientsMatching, getTableRowByText } from "./helpers/ui-flows";

test.describe("Client Management", () => {
  test.describe.configure({ mode: "serial" });
  // Use a unique name based on timestamp to avoid conflicts
  const uniqueId = `pw-${Date.now()}`;
  const TEST_CLIENT = {
    name: `Playwright Client ${uniqueId}`,
    phone: "07700 900000",
    email: "test@example.com",
    address: "123 Test Street",
    notes: "Test notes",
  };

  const UPDATED_PHONE = "07700 999999";

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/clients");
  });

  test.afterAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      storageState: testInfo.project.use.storageState,
    });
    const page = await context.newPage();

    try {
      await page.setViewportSize({ width: 1280, height: 720 });
      await deleteClientsMatching(page, "Playwright Client pw-");
    } finally {
      await context.close();
    }
  });

  test("full client lifecycle: create, edit phone, delete", async ({ page }) => {
    const clientRow = await createClientViaUi(page, TEST_CLIENT);

    // --- EDIT PHONE ---
    // Click on the client name in the row
    await clientRow.locator("td").first().click();
    await expect(page.getByRole("heading", { name: /edit client/i })).toBeVisible();

    // Verify pre-filled
    await expect(page.locator("#phone-desktop")).toHaveValue(TEST_CLIENT.phone);

    // Update phone
    await page.locator("#phone-desktop").fill(UPDATED_PHONE);
    await page.getByRole("button", { name: /update client/i }).click();

    // Wait for success
    await expect(page.getByText(/updated successfully/i)).toBeVisible({ timeout: 5000 });

    // Verify updated phone in table
    const updatedRow = getTableRowByText(page, TEST_CLIENT.name, UPDATED_PHONE);
    await expect(updatedRow).toBeVisible();

    // --- DELETE CLIENT ---
    // Click delete on the updated row
    await updatedRow.locator("button[aria-label='Delete client']").click();

    // Confirm in modal
    await expect(page.getByRole("heading", { name: /delete client\?/i })).toBeVisible();
    await page.getByRole("button", { name: /^delete$/i }).click();

    // Verify success
    await expect(page.getByText(/deleted/i)).toBeVisible({ timeout: 5000 });

    // Verify client gone
    await expect(page.locator("tbody tr").filter({ hasText: TEST_CLIENT.name })).not.toBeVisible();
  });

});