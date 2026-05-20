import { test, expect, chromium, Browser, BrowserContext } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";

import { getSupabaseTestEnv } from "./helpers/supabase-env";

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = getSupabaseTestEnv();

// ============================================================
// Helpers: create isolated user sessions for cross-user testing
// ============================================================

function makeUser() {
  return {
    email: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: "securepassword123!",
  };
}

function getProjectRef() {
  return new URL(SUPABASE_URL).hostname.split(".")[0];
}

function encodeSession(session: Session) {
  return `base64-${Buffer.from(JSON.stringify(session)).toString("base64")}`;
}

async function createSession(
  email: string,
  password: string,
  maxAttempts = 4,
): Promise<Session> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let lastError = "Unknown error";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const signUpResult = await supabase.auth.signUp({ email, password });

    if (signUpResult.data.session) {
      return signUpResult.data.session;
    }

    if (!signUpResult.error) {
      const signInResult = await supabase.auth.signInWithPassword({ email, password });

      if (signInResult.data.session) {
        return signInResult.data.session;
      }

      lastError = signInResult.error?.message ?? "sign-in did not return a session";
    } else {
      lastError = signUpResult.error.message;
    }

    const isRateLimited =
      lastError.toLowerCase().includes("rate limit") ||
      lastError.toLowerCase().includes("too many");

    if (isRateLimited && attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 3_000));
      continue;
    }

    break;
  }

  throw new Error(`Failed to create security test session: ${lastError}`);
}

async function createAuthenticatedContext(
  browser: Browser,
  email: string,
  password: string,
) {
  const context = await browser.newContext();
  const session = await createSession(email, password);
  const baseUrl = new URL(BASE_URL);

  await context.addCookies([
    {
      name: `sb-${getProjectRef()}-auth-token`,
      value: encodeSession(session),
      domain: baseUrl.hostname,
      path: "/",
      expires: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      httpOnly: false,
      secure: baseUrl.protocol === "https:",
      sameSite: "Lax",
    },
  ]);

  return context;
}

// ============================================================
// ISSUE 1: proxy.ts is dead code — no unauthenticated redirect
// ============================================================

test.describe("ISSUE 1: Unauthenticated access redirects to login", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects /dashboard to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    console.log("DEBUG URL:", page.url());
    console.log("DEBUG TITLE:", await page.title());
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("redirects /clients to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/clients`);
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("redirects /job-sites to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/job-sites`);
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("redirects /quotes to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/quotes`);
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

// ============================================================
// ISSUE 2 & 3: Cross-user data isolation via API
// ============================================================

test.describe("ISSUE 2 & 3: Cross-user API data isolation", () => {
  // serial: one worker runs all tests so beforeAll fires exactly once,
  // preventing concurrent browser-based signups from stalling on the form.
  test.describe.configure({ mode: "serial" });
  let browser: Browser;
  let aliceContext: BrowserContext;
  let bobContext: BrowserContext;
  let aliceClientIds: string[];
  let aliceJobSiteIds: string[];
  let aliceQuoteIds: string[];

  test.beforeAll(async () => {
    // Create two isolated authenticated sessions without going through the UI.
    browser = await chromium.launch();

    const alice = makeUser();
    const bob = makeUser();
    aliceContext = await createAuthenticatedContext(browser, alice.email, alice.password);
    bobContext = await createAuthenticatedContext(browser, bob.email, bob.password);

    // --- Alice creates resources ---

    // Alice creates a client
    const clientRes = await aliceContext.request.post(`${BASE_URL}/api/clients`, {
      headers: { "Content-Type": "application/json" },
      data: { name: "Alice Client", phone: "07700 111111", email: "alice@client.com" },
    });
    const clientData = await clientRes.json();
    aliceClientIds = [clientData.client.id];

    // Alice creates a job site
    const jsRes = await aliceContext.request.post(`${BASE_URL}/api/job-sites`, {
      headers: { "Content-Type": "application/json" },
      data: {
        client_id: aliceClientIds[0],
        title: "Alice Job Site",
        address: "1 Alice Lane",
        status: "planned",
      },
    });
    const jsData = await jsRes.json();
    aliceJobSiteIds = [jsData.job_site.id];

    // Alice creates a quote
    const quoteRes = await aliceContext.request.post(
      `${BASE_URL}/api/job-sites/${aliceJobSiteIds[0]}/quotes`,
      {
        headers: { "Content-Type": "application/json" },
        data: { status: "draft" },
      }
    );
    const quoteData = await quoteRes.json();
    aliceQuoteIds = [quoteData.quote.id];

    // Alice adds a line item
    await aliceContext.request.post(
      `${BASE_URL}/api/quotes/${aliceQuoteIds[0]}/items`,
      {
        headers: { "Content-Type": "application/json" },
        data: { description: "Test item", quantity: 1, unit_price: 10 },
      }
    );

  });

  test.afterAll(async () => {
    await aliceContext.close();
    await bobContext.close();
    // Close the browser here, not in beforeAll — closing it there disposes the
    // contexts and their APIRequestContexts before any test can use them.
    await browser.close();
  });

  // --- ISSUE 2: Bob cannot see Alice's data ---

  test("Bob cannot list Alice's clients", async () => {
    const res = await bobContext.request.get(`${BASE_URL}/api/clients`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.clients).toHaveLength(0);
  });

  test("Bob cannot GET Alice's client by ID", async () => {
    const res = await bobContext.request.get(
      `${BASE_URL}/api/clients/${aliceClientIds[0]}`
    );
    expect(res.status()).toBe(404);
  });

  test("Bob cannot list Alice's job sites", async () => {
    const res = await bobContext.request.get(`${BASE_URL}/api/job-sites`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.job_sites).toHaveLength(0);
  });

  test("Bob cannot list Alice's job sites by passing her client_id", async () => {
    const res = await bobContext.request.get(
      `${BASE_URL}/api/job-sites?client_id=${aliceClientIds[0]}`
    );
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.job_sites).toHaveLength(0);
  });

  test("Bob cannot GET Alice's job site by ID", async () => {
    const res = await bobContext.request.get(
      `${BASE_URL}/api/job-sites/${aliceJobSiteIds[0]}`
    );
    expect([403, 404]).toContain(res.status());
  });

  test("Bob cannot list Alice's quotes", async () => {
    const res = await bobContext.request.get(`${BASE_URL}/api/quotes`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.quotes).toHaveLength(0);
  });

  test("Bob cannot GET Alice's quote by ID", async () => {
    const res = await bobContext.request.get(
      `${BASE_URL}/api/quotes/${aliceQuoteIds[0]}`
    );
    expect([403, 404]).toContain(res.status());
  });

  test("Bob cannot GET Alice's quote PDF", async () => {
    const res = await bobContext.request.get(
      `${BASE_URL}/api/quotes/${aliceQuoteIds[0]}/pdf`
    );
    expect([403, 404]).toContain(res.status());
  });

  // --- ISSUE 3: Bob cannot modify Alice's data ---

  test("Bob cannot UPDATE Alice's client", async () => {
    const res = await bobContext.request.put(
      `${BASE_URL}/api/clients/${aliceClientIds[0]}`,
      {
        headers: { "Content-Type": "application/json" },
        data: { name: "Hacked", phone: "0000000000" },
      }
    );
    expect([403, 404]).toContain(res.status());
  });

  test("Bob cannot DELETE Alice's client", async () => {
    const res = await bobContext.request.delete(
      `${BASE_URL}/api/clients/${aliceClientIds[0]}`
    );
    expect([403, 404]).toContain(res.status());
  });

  test("Bob cannot UPDATE Alice's job site", async () => {
    const res = await bobContext.request.put(
      `${BASE_URL}/api/job-sites/${aliceJobSiteIds[0]}`,
      {
        headers: { "Content-Type": "application/json" },
        data: { title: "Hacked", address: "Hacked address" },
      }
    );
    expect([403, 404]).toContain(res.status());
  });

  test("Bob cannot DELETE Alice's job site", async () => {
    const res = await bobContext.request.delete(
      `${BASE_URL}/api/job-sites/${aliceJobSiteIds[0]}`
    );
    expect([403, 404]).toContain(res.status());
  });

  test("Bob cannot CREATE a quote on Alice's job site", async () => {
    const res = await bobContext.request.post(
      `${BASE_URL}/api/job-sites/${aliceJobSiteIds[0]}/quotes`,
      {
        headers: { "Content-Type": "application/json" },
        data: { status: "draft" },
      }
    );
    expect([403, 404]).toContain(res.status());
  });

  test("Bob cannot UPDATE Alice's quote", async () => {
    const res = await bobContext.request.put(
      `${BASE_URL}/api/quotes/${aliceQuoteIds[0]}`,
      {
        headers: { "Content-Type": "application/json" },
        data: { notes: "Hacked" },
      }
    );
    expect([403, 404]).toContain(res.status());
  });

  test("Bob cannot DELETE Alice's quote", async () => {
    const res = await bobContext.request.delete(
      `${BASE_URL}/api/quotes/${aliceQuoteIds[0]}`
    );
    expect([403, 404]).toContain(res.status());
  });

  test("Bob cannot list line items on Alice's quote", async () => {
    const res = await bobContext.request.get(
      `${BASE_URL}/api/quotes/${aliceQuoteIds[0]}/items`
    );
    expect([403, 404]).toContain(res.status());
  });

  test("Bob cannot add items to Alice's quote", async () => {
    const res = await bobContext.request.post(
      `${BASE_URL}/api/quotes/${aliceQuoteIds[0]}/items`,
      {
        headers: { "Content-Type": "application/json" },
        data: { description: "Malicious item", quantity: 1, unit_price: 999 },
      }
    );
    expect([403, 404]).toContain(res.status());
  });

  test("Bob cannot access Alice's quote via job_site_id param", async () => {
    const res = await bobContext.request.get(
      `${BASE_URL}/api/quotes?job_site_id=${aliceJobSiteIds[0]}`
    );
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.quotes).toHaveLength(0);
  });
});

// ============================================================
// ISSUE 6: DELETE /api/clients — job-site count must be scoped to user
// ============================================================

test.describe("ISSUE 6: DELETE client job-site count is user-scoped", () => {
  test.describe.configure({ mode: "serial" });
  let browser: Browser;
  let aliceContext: BrowserContext;
  let bobContext: BrowserContext;
  let bobClientIds: string[];

  test.beforeAll(async () => {
    browser = await chromium.launch();

    const alice = makeUser();
    const bob = makeUser();
    aliceContext = await createAuthenticatedContext(browser, alice.email, alice.password);
    bobContext = await createAuthenticatedContext(browser, bob.email, bob.password);

    // Alice creates client + job site
    const clientRes = await aliceContext.request.post(`${BASE_URL}/api/clients`, {
      headers: { "Content-Type": "application/json" },
      data: { name: "Alice Blocker", phone: "07700 222222" },
    });
    const clientData = await clientRes.json();
    const aliceClientId = clientData.client.id;

    await aliceContext.request.post(`${BASE_URL}/api/job-sites`, {
      headers: { "Content-Type": "application/json" },
      data: {
        client_id: aliceClientId,
        title: "Alice Blocker Site",
        address: "2 Alice Lane",
      },
    });

    // Bob creates his own client (no job sites — should be deletable)
    const bobClientRes = await bobContext.request.post(`${BASE_URL}/api/clients`, {
      headers: { "Content-Type": "application/json" },
      data: { name: "Bob Client", phone: "07700 333333" },
    });
    const bobClientData = await bobClientRes.json();
    bobClientIds = [bobClientData.client.id];
  });

  test.afterAll(async () => {
    await aliceContext.close();
    await bobContext.close();
    await browser.close();
  });

  test("Bob can delete his own client that has no job sites", async () => {
    const res = await bobContext.request.delete(
      `${BASE_URL}/api/clients/${bobClientIds[0]}`
    );
    expect(res.status()).toBe(200);
  });

  test("Alice cannot delete her client that has a job site", async () => {
    // First, re-fetch Alice's client ID (it's the one with the job site)
    const listRes = await aliceContext.request.get(`${BASE_URL}/api/clients`);
    const listData = await listRes.json();
    const blocker = listData.clients.find(
      (c: any) => c.name === "Alice Blocker"
    );
    expect(blocker).toBeTruthy();

    const res = await aliceContext.request.delete(
      `${BASE_URL}/api/clients/${blocker.id}`
    );
    expect(res.status()).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/delete job sites first/i);
  });
});
