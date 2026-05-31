import { test, expect } from "@playwright/test";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import {
  buildAuthCookie,
  createSession,
  SUPABASE_URL,
} from "./helpers/supabase-auth";
import { createClientViaUi, createJobSiteViaUi, createQuoteAndDownloadPdf } from "./helpers/ui-flows";
import { makeUser } from "./helpers/test-users";

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for subscription regression tests");
}

function buildAdminClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe("Subscription regression", () => {
  test.describe.configure({ mode: "serial" });

  test("free user can use core CRM features and hits the job-site wall at 5 active sites", async ({ browser, baseURL }) => {
    const creds = makeUser("pw-free-regression", "playwright123!");
    const session = await createSession(creds.email, creds.password);
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 1280, height: 720 },
    });
    await context.addCookies([buildAuthCookie(session, baseURL!)]);
    const page = await context.newPage();

    try {
      const clientName = `Free Regression Client ${Date.now()}`;
      await createClientViaUi(page, {
        name: clientName,
        phone: "07700 930000",
        email: creds.email,
      });

      const jobSiteTitles: string[] = [];
      for (let index = 1; index <= 5; index += 1) {
        const title = `Free Regression Site ${index} ${Date.now()}-${index}`;
        jobSiteTitles.push(title);
        await createJobSiteViaUi(page, {
          clientName,
          title,
          address: `${index} Free Regression Street`,
        });
      }

      await page.goto("/job-sites");
      await page.getByRole("button", { name: /add job site/i }).click();
      await expect(page.getByRole("dialog", { name: /you've hit the free tier limit/i })).toBeVisible({ timeout: 5000 });
      await page.getByRole("button", { name: /maybe later/i }).click();

      const pdfFilename = await createQuoteAndDownloadPdf(page, jobSiteTitles[0]);
      expect(pdfFilename).toMatch(/Q-\d{3}\.pdf$/);
    } finally {
      await context.close();
    }
  });

  test("premium user can use the same CRM features with more than 5 active job sites", async ({ browser, baseURL }) => {
    const creds = makeUser("pw-premium-regression", "playwright123!");
    const session = await createSession(creds.email, creds.password);
    const admin = buildAdminClient();

    const { error: billingError } = await admin
      .from("account_billing")
      .update({
        plan_tier: "premium",
        access_state: "premium_active",
      })
      .eq("user_id", session.user.id);

    expect(billingError).toBeNull();

    const context = await browser.newContext({
      baseURL,
      viewport: { width: 1280, height: 720 },
    });
    await context.addCookies([buildAuthCookie(session, baseURL!)]);
    const page = await context.newPage();

    try {
      const clientName = `Premium Regression Client ${Date.now()}`;
      await createClientViaUi(page, {
        name: clientName,
        phone: "07700 940000",
        email: creds.email,
      });

      const jobSiteTitles: string[] = [];
      for (let index = 1; index <= 6; index += 1) {
        const title = `Premium Regression Site ${index} ${Date.now()}-${index}`;
        jobSiteTitles.push(title);
        await createJobSiteViaUi(page, {
          clientName,
          title,
          address: `${index} Premium Regression Street`,
        });
      }

      await page.goto("/job-sites");
      await expect(page.getByText("You've hit the free tier limit")).not.toBeVisible();

      const pdfFilename = await createQuoteAndDownloadPdf(page, jobSiteTitles[5]);
      expect(pdfFilename).toMatch(/Q-\d{3}\.pdf$/);
    } finally {
      await context.close();
    }
  });
});
