// @vitest-environment node

import { createClient as createSupabaseClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it } from "vitest";

import { SUPABASE_ANON_KEY, SUPABASE_URL, createSession } from "../helpers/supabase-auth";
import { makeUser } from "../helpers/test-users";

type TestSupabaseClient = SupabaseClient & {
  auth: SupabaseClient["auth"] & {
    getUser: () => Promise<{ data: { user: Session["user"] }; error: null }>;
  };
};

type BillingRow = {
  user_id: string;
  plan_tier: "free" | "premium";
  access_state: "free" | "premium_active" | "premium_canceling" | "payment_retrying" | "past_due";
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
};

let firstSession: Session;
let secondSession: Session;
let firstClient: TestSupabaseClient;
let secondClient: TestSupabaseClient;

function createAuthedClient(session: Session): TestSupabaseClient {
  const client = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  }) as TestSupabaseClient;

  client.auth.getUser = async () => ({
    data: { user: session.user },
    error: null,
  });

  return client;
}

async function fetchOwnBilling(client: TestSupabaseClient, userId: string) {
  const result = await client
    .from("account_billing")
    .select("user_id, plan_tier, access_state, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, stripe_price_id")
    .eq("user_id", userId)
    .single();

  return result as { data: BillingRow | null; error: { message: string } | null };
}

beforeEach(async () => {
  const firstUser = makeUser("vitest-account-billing", "integration123!");
  const secondUser = makeUser("vitest-account-billing-peer", "integration123!");

  firstSession = await createSession(firstUser.email, firstUser.password);
  secondSession = await createSession(secondUser.email, secondUser.password);
  firstClient = createAuthedClient(firstSession);
  secondClient = createAuthedClient(secondSession);
}, 30_000);

describe.sequential("Account billing", () => {
  it("creates a free billing row automatically for new users", async () => {
    const { data, error } = await fetchOwnBilling(firstClient, firstSession.user.id);

    expect(error).toBeNull();
    expect(data).toMatchObject({
      user_id: firstSession.user.id,
      plan_tier: "free",
      access_state: "free",
      cancel_at_period_end: false,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_price_id: null,
    });

    const visibleRows = await firstClient
      .from("account_billing")
      .select("user_id");

    expect(visibleRows.error).toBeNull();
    expect(visibleRows.data).toEqual([{ user_id: firstSession.user.id }]);
  }, 30_000);

  it("applies RLS so users cannot read another account's billing row", async () => {
    const ownRow = await fetchOwnBilling(secondClient, secondSession.user.id);
    expect(ownRow.error).toBeNull();
    expect(ownRow.data?.user_id).toBe(secondSession.user.id);

    const otherRow = await firstClient
      .from("account_billing")
      .select("user_id, plan_tier")
      .eq("user_id", secondSession.user.id)
      .maybeSingle();

    expect(otherRow.error).toBeNull();
    expect(otherRow.data).toBeNull();
  }, 30_000);

  it("does not let authenticated users update their own billing state directly", async () => {
    const updateAttempt = await firstClient
      .from("account_billing")
      .update({
        plan_tier: "premium",
        access_state: "premium_active",
      })
      .eq("user_id", firstSession.user.id);

    expect(updateAttempt.error).not.toBeNull();

    const { data, error } = await fetchOwnBilling(firstClient, firstSession.user.id);

    expect(error).toBeNull();
    expect(data).toMatchObject({
      plan_tier: "free",
      access_state: "free",
    });
  }, 30_000);
});
