import { test, expect } from "@playwright/test";

test.describe("Client Management", () => {
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

  test("full client lifecycle: create, edit phone, delete", async ({ page }) => {
    // --- CREATE CLIENT ---
    await page.getByRole("button", { name: /add client/i }).click();
    await expect(page.locator("#name-desktop")).toBeVisible({ timeout: 5000 });

    await page.locator("#name-desktop").fill(TEST_CLIENT.name);
    await page.locator("#phone-desktop").fill(TEST_CLIENT.phone);
    await page.locator("#email-desktop").fill(TEST_CLIENT.email);
    await page.locator("#address-desktop").fill(TEST_CLIENT.address);
    await page.locator("#notes-desktop").fill(TEST_CLIENT.notes);

    await page.getByRole("button", { name: /create client/i }).click();

    // Wait for success
    await expect(page.getByText(/added successfully/i)).toBeVisible({ timeout: 5000 });

    // Wait for the table row with our client
    const clientRow = page.locator("tbody tr").filter({ hasText: TEST_CLIENT.name }).filter({ hasText: TEST_CLIENT.phone });
    await expect(clientRow).toBeVisible();

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
    const updatedRow = page.locator("tbody tr").filter({ hasText: TEST_CLIENT.name }).filter({ hasText: UPDATED_PHONE });
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

  test("cleanup: remove test data", async ({ page }) => {
    // This test runs last and cleans up any leftover test clients
    await page.goto("/clients");
    
    // Delete any clients that match our pattern
    const leftoverClients = page.locator("tbody tr").filter({ hasText: "Playwright Client pw-" });
    
    // Delete each one
    const count = await leftoverClients.count();
    for (let i = 0; i < count; i++) {
      await leftoverClients.first().locator("button[aria-label='Delete client']").click();
      await page.getByRole("button", { name: /^delete$/i }).click();
      await page.waitForTimeout(500); // Wait for deletion to complete
    }
  });
});