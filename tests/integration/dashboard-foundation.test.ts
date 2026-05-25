// @vitest-environment node

import { createClient as createSupabaseClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SUPABASE_ANON_KEY, SUPABASE_URL, createSession } from "../helpers/supabase-auth";
import { makeUser } from "../helpers/test-users";

type TestSupabaseClient = SupabaseClient & {
  auth: SupabaseClient["auth"] & {
    getUser: () => Promise<{ data: { user: Session["user"] }; error: null }>;
  };
};

let supabase: TestSupabaseClient;
let session: Session;
let createdClientId: string | null = null;
let createdJobSiteId: string | null = null;
let createdQuoteId: string | null = null;

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

beforeEach(async () => {
  const user = makeUser("vitest-dashboard", "integration123!");
  session = await createSession(user.email, user.password);
  supabase = createAuthedClient(session);
  createdClientId = null;
  createdJobSiteId = null;
  createdQuoteId = null;
}, 30_000);

afterEach(async () => {
  if (createdQuoteId) {
    await supabase.from("quote_line_items").delete().eq("quote_id", createdQuoteId);
    await supabase.from("quotes").delete().eq("id", createdQuoteId);
  }

  if (createdJobSiteId) {
    await supabase.from("job_sites").delete().eq("id", createdJobSiteId);
  }

  if (createdClientId) {
    await supabase.from("clients").delete().eq("id", createdClientId);
  }

  await supabase.from("activity_log").delete().eq("user_id", session.user.id);
}, 10_000);

describe.sequential("Dashboard foundation", () => {
  it("tracks accepted monthly totals and recent activity from the database", async () => {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({
        user_id: session.user.id,
        name: "Dashboard Test Client",
        phone: "07700 900123",
        email: "dashboard@example.com",
      })
      .select()
      .single();

    expect(clientError).toBeNull();
    expect(client?.id).toBeTruthy();
    createdClientId = client!.id;

    const { data: jobSite, error: jobSiteError } = await supabase
      .from("job_sites")
      .insert({
        client_id: createdClientId,
        title: "Kitchen Rewire",
        address: "42 Elm Street",
        status: "planned",
      })
      .select()
      .single();

    expect(jobSiteError).toBeNull();
    createdJobSiteId = jobSite!.id;

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .insert({
        job_site_id: createdJobSiteId,
        quote_number: "Q-901",
        status: "draft",
      })
      .select()
      .single();

    expect(quoteError).toBeNull();
    createdQuoteId = quote!.id;

    const { error: lineItemsError } = await supabase.from("quote_line_items").insert([
      {
        quote_id: createdQuoteId,
        description: "Labour",
        quantity: 2,
        unit_price: 45,
        sort_order: 0,
      },
      {
        quote_id: createdQuoteId,
        description: "Materials",
        quantity: 1,
        unit_price: 40,
        sort_order: 1,
      },
    ]);

    expect(lineItemsError).toBeNull();

    const { error: sentError } = await supabase
      .from("quotes")
      .update({ status: "sent" })
      .eq("id", createdQuoteId);
    expect(sentError).toBeNull();

    const { data: acceptedQuote, error: acceptedError } = await supabase
      .from("quotes")
      .update({ status: "accepted" })
      .eq("id", createdQuoteId)
      .select("status, accepted_at")
      .single();

    expect(acceptedError).toBeNull();
    expect(acceptedQuote?.status).toBe("accepted");
    expect(acceptedQuote?.accepted_at).toBeTruthy();

    const summaryResponse = await supabase.rpc("get_dashboard_summary");
    expect(summaryResponse.error).toBeNull();

    const summary = Array.isArray(summaryResponse.data)
      ? summaryResponse.data[0]
      : summaryResponse.data;

    expect(Number(summary.active_job_sites_count)).toBe(1);
    expect(Number(summary.clients_count)).toBe(1);
    expect(Number(summary.quotes_draft_count)).toBe(0);
    expect(Number(summary.quotes_sent_count)).toBe(0);
    expect(Number(summary.quotes_accepted_count)).toBe(1);
    expect(Number(summary.quotes_rejected_count)).toBe(0);
    expect(Number(summary.accepted_value_this_month)).toBe(130);

    const recentActivityResponse = await supabase.rpc("get_recent_activity", { limit_count: 5 });
    expect(recentActivityResponse.error).toBeNull();

    const eventTypes = (recentActivityResponse.data ?? []).map((event) => event.event_type);
    expect(eventTypes).toHaveLength(5);
    expect(eventTypes.slice(0, 2).sort()).toEqual(["quote_accepted", "quote_sent"]);
    expect(eventTypes.slice(2)).toEqual([
      "quote_created",
      "job_site_created",
      "client_created",
    ]);
  }, 30_000);
});
