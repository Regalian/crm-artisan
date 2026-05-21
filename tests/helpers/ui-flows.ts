import { expect, type Locator, type Page } from "@playwright/test";

export type ClientFormInput = {
  name: string;
  phone: string;
  email: string;
  address?: string;
  notes?: string;
};

export type JobSiteFormInput = {
  clientName: string;
  title: string;
  address: string;
};

export function getTableRowByText(page: Page, primaryText: string, secondaryText?: string): Locator {
  let row = page.locator("tbody tr").filter({ hasText: primaryText });

  if (secondaryText) {
    row = row.filter({ hasText: secondaryText });
  }

  return row;
}

export async function createClientViaUi(page: Page, client: ClientFormInput): Promise<Locator> {
  await page.goto("/clients");
  await page.getByRole("button", { name: /add client/i }).click();
  await expect(page.locator("#name-desktop")).toBeVisible({ timeout: 5000 });

  await page.locator("#name-desktop").fill(client.name);
  await page.locator("#phone-desktop").fill(client.phone);
  await page.locator("#email-desktop").fill(client.email);

  if (client.address) {
    await page.locator("#address-desktop").fill(client.address);
  }

  if (client.notes) {
    await page.locator("#notes-desktop").fill(client.notes);
  }

  await page.getByRole("button", { name: /create client/i }).click();
  await expect(page.getByText(/added successfully/i)).toBeVisible({ timeout: 5000 });

  const clientRow = getTableRowByText(page, client.name, client.phone);
  await expect(clientRow).toBeVisible();
  return clientRow;
}

export async function createJobSiteViaUi(page: Page, jobSite: JobSiteFormInput): Promise<Locator> {
  await page.goto("/job-sites");
  await page.getByRole("button", { name: /add job site/i }).click();
  await expect(page.locator("#title-desktop")).toBeVisible({ timeout: 5000 });

  await page.locator("#client-desktop").selectOption({ label: jobSite.clientName });
  await page.locator("#title-desktop").fill(jobSite.title);
  await page.locator("#address-desktop").fill(jobSite.address);
  await page.getByRole("button", { name: /create job site/i }).click();

  await expect(page.getByText(/added successfully/i)).toBeVisible({ timeout: 5000 });

  const jobSiteRow = getTableRowByText(page, jobSite.title);
  await expect(jobSiteRow).toBeVisible();
  return jobSiteRow;
}

export async function deleteClientsMatching(page: Page, rowText: string): Promise<void> {
  await page.goto("/clients");
  await page.waitForLoadState("networkidle");

  const leftoverClients = page.locator("tbody tr").filter({ hasText: rowText });
  const count = await leftoverClients.count();

  for (let i = 0; i < count; i++) {
    await leftoverClients.first().locator("button[aria-label='Delete client']").click();
    await page.getByRole("button", { name: /^delete$/i }).click();
    await page.waitForTimeout(500);
  }
}
