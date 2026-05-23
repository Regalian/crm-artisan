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

function getClientDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: /(?:add new|edit) client/i });
}

function getJobSiteDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: /(?:add new|edit) job site/i });
}

export async function createClientViaUi(page: Page, client: ClientFormInput): Promise<Locator> {
  await page.goto("/clients");
  await page.getByRole("button", { name: /add client/i }).click();

  const dialog = getClientDialog(page);
  await expect(dialog).toBeVisible({ timeout: 5000 });

  await dialog.getByLabel("Name").fill(client.name);
  await dialog.getByLabel("Phone").fill(client.phone);
  await dialog.getByLabel("Email").fill(client.email);

  if (client.address) {
    await dialog.getByLabel("Address").fill(client.address);
  }

  if (client.notes) {
    await dialog.getByLabel("Notes").fill(client.notes);
  }

  await dialog.getByRole("button", { name: /create client/i }).click();
  await expect(page.getByText(/added successfully/i)).toBeVisible({ timeout: 5000 });

  const clientRow = getTableRowByText(page, client.name, client.phone);
  await expect(clientRow).toBeVisible();
  return clientRow;
}

export async function createJobSiteViaUi(page: Page, jobSite: JobSiteFormInput): Promise<Locator> {
  await page.goto("/job-sites");
  await page.getByRole("button", { name: /add job site/i }).click();

  const dialog = getJobSiteDialog(page);
  await expect(dialog).toBeVisible({ timeout: 5000 });

  await dialog.getByLabel("Client").selectOption({ label: jobSite.clientName });
  await dialog.getByLabel("Title").fill(jobSite.title);
  await dialog.getByLabel("Address").fill(jobSite.address);
  await dialog.getByRole("button", { name: /create job site/i }).click();

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
