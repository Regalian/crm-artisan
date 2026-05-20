/**
 * Security regression tests for the get_next_quote_number() RPC vulnerability.
 * Reference: SECURITY-AUDIT.MD — Finding 1, Severity: High
 *
 * Root cause
 * ----------
 * The function lives in the exposed `public` schema, is declared
 * SECURITY DEFINER, and authorises callers using a caller-supplied
 * `p_user_id` parameter rather than `auth.uid()`.  Any logged-in user
 * can therefore call it *directly* (bypassing the Next.js app) with an
 * arbitrary payload.
 *
 * Two distinct attack paths are exercised below:
 *
 *   Exploit A — Existence oracle
 *     Probe arbitrary job_site_id UUIDs.  The function currently returns
 *     different error messages ("Job site not found" vs "Access denied"),
 *     letting an attacker enumerate which UUIDs belong to real tenants.
 *
 *   Exploit B — Quote-metadata disclosure
 *     Supply the victim's user_id as p_user_id alongside their
 *     job_site_id.  The function's ownership check passes (both sides of
 *     the comparison are the victim's id) and returns data like "AC-002",
 *     leaking client initials and quote count.
 *
 * Test lifecycle
 * --------------
 *   BEFORE the fix migration (20260518000003):
 *     • Exploit A FAILS — distinguishable errors confirm the oracle.
 *     • Exploit B FAILS — status 200 returned to the attacker.
 *     • Positive FAILS  — new (p_job_site_id-only) signature doesn't exist yet.
 *
 *   AFTER the fix migration:
 *     • Exploit A PASSES — single opaque error closes the oracle.
 *     • Exploit B PASSES — auth.uid() replaces p_user_id; Bob's session
 *                          does not match Alice's data → rejected.
 *     • Positive PASSES  — fixed function serves legitimate calls correctly.
 */

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// ── constants ──────────────────────────────────────────────────────────────────
// These are the public/publishable keys — safe to hard-code in tests.
const SUPABASE_URL     = "https://xzfzwwgvqwhwdquierpt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NPdd9PnxBUvUnmNvTQ5FkA_z6qzXc97";
const RPC_ENDPOINT     = `${SUPABASE_URL}/rest/v1/rpc/get_next_quote_number`;

// ── helpers ────────────────────────────────────────────────────────────────────

function makeEmail(): string {
  return `sec-rpc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/**
 * Sign up a fresh user via the Supabase JS SDK and return their access token
 * and user id.  With email confirmations disabled (the project default) the
 * session is returned immediately.
 *
 * Retries up to `maxAttempts` times with linear back-off when the Supabase
 * auth endpoint returns a rate-limit error.  Running the full test suite in
 * parallel creates many users in quick succession and can transiently exceed
 * the 30 sign-ups / 5 min / IP limit; the retry keeps the test green without
 * requiring the caller to slow down.
 */
async function signUpUser(
  email: string,
  password: string,
  maxAttempts = 4,
): Promise<{ token: string; userId: string }> {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let lastError: string | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await sb.auth.signUp({ email, password });

    if (!error && data.session) {
      return { token: data.session.access_token, userId: data.user!.id };
    }

    lastError = error?.message ?? "no session returned";
    const isRateLimit =
      lastError.toLowerCase().includes("rate limit") ||
      lastError.toLowerCase().includes("too many");

    if (isRateLimit && attempt < maxAttempts) {
      // Wait 3 s × attempt before retrying (3 s, 6 s, 9 s).
      await new Promise((r) => setTimeout(r, attempt * 3_000));
      continue;
    }

    break;
  }

  throw new Error(`signUp failed for ${email}: ${lastError}`);
}

/**
 * INSERT a row into a Supabase table via the PostgREST REST API using the
 * caller-supplied JWT, and return the inserted row.
 */
async function restInsert<T extends object>(
  token: string,
  table: string,
  body: object,
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      apikey:         SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      Prefer:         "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `POST /rest/v1/${table} failed (${res.status}): ${await res.text()}`,
    );
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

/**
 * Call the Supabase RPC endpoint DIRECTLY — bypassing the Next.js application.
 * This is the attack surface identified in the security audit.
 */
async function callRpcDirect(
  callerToken: string,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(RPC_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${callerToken}`,
      apikey:         SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() };
}

// ── test suite ─────────────────────────────────────────────────────────────────

test.describe("SECURITY: get_next_quote_number RPC — cross-user data exposure", () => {
  // Shared state initialised once for the whole describe block.
  let aliceToken:     string;
  let aliceUserId:    string;
  let aliceJobSiteId: string;

  let bobToken:     string;
  let bobUserId:    string;
  let bobJobSiteId: string;

  test.beforeAll(async () => {
    const password = "securepassword123!";

    // ── Alice ─────────────────────────────────────────────────────────────────
    // Alice is the victim whose data must stay private.
    ({ token: aliceToken, userId: aliceUserId } =
      await signUpUser(makeEmail(), password));

    // user_id is filled by DEFAULT auth.uid() (migration 20260518000000).
    const aliceClient = await restInsert<{ id: string }>(
      aliceToken, "clients",
      { name: "Acme Corp", phone: "07700 000001" },
    );

    const aliceJobSite = await restInsert<{ id: string }>(
      aliceToken, "job_sites",
      {
        client_id: aliceClient.id,
        title:     "Alice Job Site",
        address:   "1 Alice Lane",
        status:    "planned",
      },
    );
    aliceJobSiteId = aliceJobSite.id;

    // One existing quote makes the next-number counter visible in the return
    // value (e.g. "AC-002"), which would confirm how many quotes exist.
    await restInsert(aliceToken, "quotes", {
      job_site_id:  aliceJobSiteId,
      quote_number: "AC-001",
      date:         "2026-01-01",
      status:       "draft",
    });

    // ── Bob ───────────────────────────────────────────────────────────────────
    // Bob is the attacker: authenticated, but with no rights to Alice's data.
    ({ token: bobToken, userId: bobUserId } =
      await signUpUser(makeEmail(), password));

    const bobClient = await restInsert<{ id: string }>(
      bobToken, "clients",
      { name: "Bob Builders", phone: "07700 000002" },
    );

    const bobJobSite = await restInsert<{ id: string }>(
      bobToken, "job_sites",
      {
        client_id: bobClient.id,
        title:     "Bob Job Site",
        address:   "2 Bob Street",
        status:    "planned",
      },
    );
    bobJobSiteId = bobJobSite.id;
  });

  // ── Exploit A: Existence oracle ─────────────────────────────────────────────

  test(
    "Exploit A — existence oracle: " +
    "both error responses must be identical whether the UUID is " +
    "non-existent or belongs to another tenant",
    async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      // Bob probes two UUIDs using his own credentials:
      //   (1) a UUID that does not exist in the database
      //   (2) Alice's UUID — which exists but belongs to a different tenant
      const { body: notFoundBody } = await callRpcDirect(bobToken, {
        p_job_site_id: nonExistentId,
        p_user_id:     bobUserId,
      });

      const { body: aliceSiteBody } = await callRpcDirect(bobToken, {
        p_job_site_id: aliceJobSiteId,
        p_user_id:     bobUserId,
      });

      // ── Before fix ──────────────────────────────────────────────────────────
      // notFoundBody.message === "Job site not found"
      // aliceSiteBody.message === "Access denied"
      // The difference confirms aliceJobSiteId exists → oracle is open.
      // → assertion FAILS (messages differ).
      //
      // ── After fix ───────────────────────────────────────────────────────────
      // The old (UUID, UUID) function signature is dropped; both calls receive
      // the same PostgREST "function not found" error, OR the hardened function
      // returns the same opaque "Not found" message for both cases.
      // → assertion PASSES (messages are equal → oracle is closed).
      expect(JSON.stringify(notFoundBody)).toBe(JSON.stringify(aliceSiteBody));
    },
  );

  // ── Exploit B: Quote-metadata disclosure ────────────────────────────────────

  test(
    "Exploit B — metadata disclosure: " +
    "Bob supplying Alice's user_id must not receive her quote-number metadata",
    async () => {
      // Bob authenticates with his own JWT but supplies Alice's identifiers.
      //
      // Vulnerable logic:
      //   IF v_actual_user_id != p_user_id           ← both sides = aliceUserId
      //   → check passes → returns "AC-002"
      //   → leaks client initials "AC" and quote count (at least 1)
      //
      // Fixed logic:
      //   IF v_actual_user_id != auth.uid()           ← auth.uid() = bobUserId
      //   → aliceUserId != bobUserId → check fails → error returned
      const { status, body } = await callRpcDirect(bobToken, {
        p_job_site_id: aliceJobSiteId,
        p_user_id:     aliceUserId,    // ← attacker supplies victim's user_id
      });

      // ── Before fix ──────────────────────────────────────────────────────────
      // status === 200, body === "AC-002"   → assertion FAILS
      //
      // ── After fix ───────────────────────────────────────────────────────────
      // status !== 200 (404 — function signature gone, or 400/403 — denied)
      // body is an error object, not a bare quote-number string
      // → assertions PASS
      expect(status).not.toBe(200);
      expect(typeof body).not.toBe("string");
    },
  );

  // ── Positive control ────────────────────────────────────────────────────────

  test(
    "Positive — the job-site owner can still generate a quote number via the fixed API",
    async () => {
      // Fixed function signature: get_next_quote_number(p_job_site_id UUID)
      // p_user_id is gone — the function derives identity from auth.uid().
      const { status, body } = await callRpcDirect(bobToken, {
        p_job_site_id: bobJobSiteId,
        // p_user_id intentionally absent — the fixed function does not need it
      });

      // ── Before fix ──────────────────────────────────────────────────────────
      // PostgREST cannot find get_next_quote_number(p_job_site_id) because
      // only the (UUID, UUID) overload exists → status 404 → assertion FAILS.
      //
      // ── After fix ───────────────────────────────────────────────────────────
      // get_next_quote_number(UUID) exists; auth.uid() = bobUserId;
      // v_actual_user_id = bobUserId → passes → returns e.g. "BO-001"
      // → assertions PASS
      expect(status).toBe(200);
      expect(typeof body).toBe("string");
      // Quote-number format: two uppercase letters, a dash, three digits.
      expect(body as string).toMatch(/^[A-Z]{2}-\d{3}$/);
    },
  );
});
