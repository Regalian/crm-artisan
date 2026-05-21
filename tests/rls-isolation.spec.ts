import { test, expect } from "@playwright/test";

import { SUPABASE_ANON_KEY, SUPABASE_URL, signUpUser } from "./helpers/supabase-auth";
import { makeEmail } from "./helpers/test-users";

async function restInsert<T extends object>(
  token: string,
  table: string,
  body: object,
): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `POST /rest/v1/${table} failed (${response.status}): ${await response.text()}`,
    );
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

async function restSelect<T extends object>(
  token: string,
  table: string,
  query: Record<string, string>,
): Promise<T[]> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `GET /rest/v1/${table} failed (${response.status}): ${await response.text()}`,
    );
  }

  return response.json();
}

type TenantFixture = {
  token: string;
  userId: string;
  clientId: string;
  jobSiteId: string;
  quoteId: string;
  quoteItemId: string;
};

test.describe("RLS isolation: direct table reads are tenant-scoped", () => {
  test.describe.configure({ mode: "serial" });

  const password = "securepassword123!";
  let alice: TenantFixture;
  let bob: TenantFixture;

  test.beforeAll(async () => {
    const aliceAuth = await signUpUser(makeEmail("rls-alice"), password);
    const bobAuth = await signUpUser(makeEmail("rls-bob"), password);

    const aliceClient = await restInsert<{ id: string }>(aliceAuth.token, "clients", {
      name: "RLS Alice Client",
      phone: "07700 100001",
    });

    const aliceJobSite = await restInsert<{ id: string }>(aliceAuth.token, "job_sites", {
      client_id: aliceClient.id,
      title: "RLS Alice Job Site",
      address: "1 Alice Lane",
      status: "planned",
    });

    const aliceQuote = await restInsert<{ id: string }>(aliceAuth.token, "quotes", {
      job_site_id: aliceJobSite.id,
      quote_number: "AL-001",
      date: "2026-01-01",
      status: "draft",
    });

    const aliceQuoteItem = await restInsert<{ id: string }>(aliceAuth.token, "quote_line_items", {
      quote_id: aliceQuote.id,
      description: "Alice line item",
      quantity: 1,
      unit_price: 100,
      sort_order: 0,
    });

    alice = {
      ...aliceAuth,
      clientId: aliceClient.id,
      jobSiteId: aliceJobSite.id,
      quoteId: aliceQuote.id,
      quoteItemId: aliceQuoteItem.id,
    };

    const bobClient = await restInsert<{ id: string }>(bobAuth.token, "clients", {
      name: "RLS Bob Client",
      phone: "07700 100002",
    });

    const bobJobSite = await restInsert<{ id: string }>(bobAuth.token, "job_sites", {
      client_id: bobClient.id,
      title: "RLS Bob Job Site",
      address: "2 Bob Street",
      status: "planned",
    });

    const bobQuote = await restInsert<{ id: string }>(bobAuth.token, "quotes", {
      job_site_id: bobJobSite.id,
      quote_number: "BO-001",
      date: "2026-01-01",
      status: "draft",
    });

    const bobQuoteItem = await restInsert<{ id: string }>(bobAuth.token, "quote_line_items", {
      quote_id: bobQuote.id,
      description: "Bob line item",
      quantity: 2,
      unit_price: 50,
      sort_order: 0,
    });

    bob = {
      ...bobAuth,
      clientId: bobClient.id,
      jobSiteId: bobJobSite.id,
      quoteId: bobQuote.id,
      quoteItemId: bobQuoteItem.id,
    };
  });

  test("clients table: each user can read only their own rows, not guessed IDs", async () => {
    const [aliceOwnById, bobOwnById, bobGuessAliceById, aliceGuessBobById, aliceList, bobList] =
      await Promise.all([
        restSelect<{ id: string }>(alice.token, "clients", {
          select: "id",
          id: `eq.${alice.clientId}`,
        }),
        restSelect<{ id: string }>(bob.token, "clients", {
          select: "id",
          id: `eq.${bob.clientId}`,
        }),
        restSelect<{ id: string }>(bob.token, "clients", {
          select: "id",
          id: `eq.${alice.clientId}`,
        }),
        restSelect<{ id: string }>(alice.token, "clients", {
          select: "id",
          id: `eq.${bob.clientId}`,
        }),
        restSelect<{ id: string }>(alice.token, "clients", {
          select: "id",
          order: "id.asc",
        }),
        restSelect<{ id: string }>(bob.token, "clients", {
          select: "id",
          order: "id.asc",
        }),
      ]);

    expect(aliceOwnById).toEqual([{ id: alice.clientId }]);
    expect(bobOwnById).toEqual([{ id: bob.clientId }]);
    expect(bobGuessAliceById).toEqual([]);
    expect(aliceGuessBobById).toEqual([]);
    expect(aliceList).toEqual([{ id: alice.clientId }]);
    expect(bobList).toEqual([{ id: bob.clientId }]);
  });

  test("job_sites table: each user can read only their own rows, not guessed IDs", async () => {
    const [aliceOwnById, bobOwnById, bobGuessAliceById, aliceGuessBobById, aliceList, bobList] =
      await Promise.all([
        restSelect<{ id: string }>(alice.token, "job_sites", {
          select: "id",
          id: `eq.${alice.jobSiteId}`,
        }),
        restSelect<{ id: string }>(bob.token, "job_sites", {
          select: "id",
          id: `eq.${bob.jobSiteId}`,
        }),
        restSelect<{ id: string }>(bob.token, "job_sites", {
          select: "id",
          id: `eq.${alice.jobSiteId}`,
        }),
        restSelect<{ id: string }>(alice.token, "job_sites", {
          select: "id",
          id: `eq.${bob.jobSiteId}`,
        }),
        restSelect<{ id: string }>(alice.token, "job_sites", {
          select: "id",
          order: "id.asc",
        }),
        restSelect<{ id: string }>(bob.token, "job_sites", {
          select: "id",
          order: "id.asc",
        }),
      ]);

    expect(aliceOwnById).toEqual([{ id: alice.jobSiteId }]);
    expect(bobOwnById).toEqual([{ id: bob.jobSiteId }]);
    expect(bobGuessAliceById).toEqual([]);
    expect(aliceGuessBobById).toEqual([]);
    expect(aliceList).toEqual([{ id: alice.jobSiteId }]);
    expect(bobList).toEqual([{ id: bob.jobSiteId }]);
  });

  test("quote_line_items table: each user can read only their own rows, not guessed IDs", async () => {
    const [aliceOwnById, bobOwnById, bobGuessAliceById, aliceGuessBobById, aliceList, bobList] =
      await Promise.all([
        restSelect<{ id: string }>(alice.token, "quote_line_items", {
          select: "id",
          id: `eq.${alice.quoteItemId}`,
        }),
        restSelect<{ id: string }>(bob.token, "quote_line_items", {
          select: "id",
          id: `eq.${bob.quoteItemId}`,
        }),
        restSelect<{ id: string }>(bob.token, "quote_line_items", {
          select: "id",
          id: `eq.${alice.quoteItemId}`,
        }),
        restSelect<{ id: string }>(alice.token, "quote_line_items", {
          select: "id",
          id: `eq.${bob.quoteItemId}`,
        }),
        restSelect<{ id: string }>(alice.token, "quote_line_items", {
          select: "id",
          order: "id.asc",
        }),
        restSelect<{ id: string }>(bob.token, "quote_line_items", {
          select: "id",
          order: "id.asc",
        }),
      ]);

    expect(aliceOwnById).toEqual([{ id: alice.quoteItemId }]);
    expect(bobOwnById).toEqual([{ id: bob.quoteItemId }]);
    expect(bobGuessAliceById).toEqual([]);
    expect(aliceGuessBobById).toEqual([]);
    expect(aliceList).toEqual([{ id: alice.quoteItemId }]);
    expect(bobList).toEqual([{ id: bob.quoteItemId }]);
  });
});
