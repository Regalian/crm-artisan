// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  createAdminClient,
  constructEvent,
  retrieveSubscription,
} = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  constructEvent: vi.fn(),
  retrieveSubscription: vi.fn(),
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient,
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent,
    },
    subscriptions: {
      retrieve: retrieveSubscription,
    },
  }),
}));

import { POST } from "@/app/api/webhooks/stripe/route";

type InsertResponse = { error: { code?: string | null; message?: string | null } | null };
type SingleResponse = { data: { user_id: string } | null; error: { message?: string | null } | null };

function makeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_123",
    object: "subscription",
    status: "active",
    customer: "cus_123",
    cancel_at: null,
    cancel_at_period_end: false,
    current_period_start: 1_717_257_600,
    current_period_end: 1_719_849_600,
    latest_invoice: "in_123",
    metadata: {
      supabase_user_id: "user_123",
    },
    items: {
      data: [
        {
          price: {
            id: "price_test_premium",
          },
        },
      ],
    },
    ...overrides,
  };
}

describe("POST /api/webhooks/stripe", () => {
  const originalEnv = process.env;
  let eventClaims: Array<Record<string, unknown>>;
  let billingUpserts: Array<Record<string, unknown>>;
  let releasedClaims: string[];
  let webhookInsertResponse: InsertResponse;
  let billingLookupResponse: SingleResponse;
  let billingUpsertError: { message: string } | null;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      STRIPE_WEBHOOK_SECRET: "whsec_test_123",
    };

    eventClaims = [];
    billingUpserts = [];
    releasedClaims = [];
    webhookInsertResponse = { error: null };
    billingLookupResponse = { data: null, error: null };
    billingUpsertError = null;

    constructEvent.mockReset();
    retrieveSubscription.mockReset();
    createAdminClient.mockReset();

    createAdminClient.mockImplementation(() => ({
      from(table: string) {
        if (table === "stripe_webhook_events") {
          return {
            insert: async (payload: Record<string, unknown>) => {
              eventClaims.push(payload);
              return webhookInsertResponse;
            },
            delete: () => ({
              eq: async (_column: string, value: string) => {
                releasedClaims.push(value);
                return { error: null };
              },
            }),
          };
        }

        if (table === "account_billing") {
          return {
            upsert: async (payload: Record<string, unknown>) => {
              billingUpserts.push(payload);
              return { error: billingUpsertError };
            },
            select: () => ({
              eq: () => ({
                maybeSingle: async () => billingLookupResponse,
              }),
            }),
          };
        }

        throw new Error(`Unexpected table mock: ${table}`);
      },
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("verifies the signature against the raw request body", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("bad signature");
    });

    const rawBody = '{"id":"evt_bad","type":"checkout.session.completed"}';
    const response = await POST(new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=1,v1=signature",
      },
      body: rawBody,
    }));

    expect(constructEvent).toHaveBeenCalledWith(rawBody, "t=1,v1=signature", "whsec_test_123");
    expect(response.status).toBe(400);
    expect(eventClaims).toHaveLength(0);
    expect(billingUpserts).toHaveLength(0);
  });

  it("processes checkout.session.completed and activates premium billing", async () => {
    constructEvent.mockReturnValue({
      id: "evt_checkout_completed",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: "cs_test_123",
          object: "checkout.session",
          mode: "subscription",
          customer: "cus_123",
          subscription: "sub_123",
          client_reference_id: "user_123",
          metadata: {
            supabase_user_id: "user_123",
          },
        },
      },
    });

    retrieveSubscription.mockResolvedValue(makeSubscription());

    const response = await POST(new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=1,v1=signature",
      },
      body: "checkout-completed",
    }));

    expect(response.status).toBe(200);
    expect(eventClaims[0]).toMatchObject({
      event_id: "evt_checkout_completed",
      event_type: "checkout.session.completed",
    });
    expect(retrieveSubscription).toHaveBeenCalledWith("sub_123", {
      expand: ["latest_invoice", "items.data.price"],
    });
    expect(billingUpserts[0]).toMatchObject({
      user_id: "user_123",
      plan_tier: "premium",
      access_state: "premium_active",
      stripe_customer_id: "cus_123",
      stripe_subscription_id: "sub_123",
      stripe_price_id: "price_test_premium",
      stripe_subscription_status: "active",
      cancel_at_period_end: false,
      last_invoice_id: "in_123",
      last_invoice_status: "paid",
      last_payment_failed_at: null,
    });
  });

  it("ignores duplicate events gracefully", async () => {
    constructEvent.mockReturnValue({
      id: "evt_duplicate",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          mode: "subscription",
          customer: "cus_123",
          subscription: "sub_123",
          client_reference_id: "user_123",
          metadata: {
            supabase_user_id: "user_123",
          },
        },
      },
    });

    webhookInsertResponse = {
      error: {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      },
    };

    const response = await POST(new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "t=1,v1=signature",
      },
      body: "duplicate",
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true });
    expect(billingUpserts).toHaveLength(0);
    expect(retrieveSubscription).not.toHaveBeenCalled();
  });

  it("marks billing as active after invoice.payment_succeeded", async () => {
    constructEvent.mockReturnValue({
      id: "evt_invoice_paid",
      type: "invoice.payment_succeeded",
      livemode: false,
      data: {
        object: {
          id: "in_paid_123",
          object: "invoice",
          subscription: "sub_123",
          customer: "cus_123",
          status: "paid",
          created: 1_717_300_000,
        },
      },
    });

    retrieveSubscription.mockResolvedValue(makeSubscription());

    const response = await POST(new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "t=1,v1=signature",
      },
      body: "invoice-paid",
    }));

    expect(response.status).toBe(200);
    expect(billingUpserts[0]).toMatchObject({
      user_id: "user_123",
      plan_tier: "premium",
      access_state: "premium_active",
      last_invoice_id: "in_paid_123",
      last_invoice_status: "paid",
      last_payment_failed_at: null,
    });
  });

  it("marks billing as retrying after invoice.payment_failed", async () => {
    constructEvent.mockReturnValue({
      id: "evt_invoice_failed",
      type: "invoice.payment_failed",
      livemode: false,
      data: {
        object: {
          id: "in_failed_123",
          object: "invoice",
          subscription: "sub_123",
          customer: "cus_123",
          status: "open",
          created: 1_717_300_000,
        },
      },
    });

    retrieveSubscription.mockResolvedValue(makeSubscription({ status: "past_due" }));

    const response = await POST(new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "t=1,v1=signature",
      },
      body: "invoice-failed",
    }));

    expect(response.status).toBe(200);
    expect(billingUpserts[0]).toMatchObject({
      user_id: "user_123",
      plan_tier: "premium",
      access_state: "payment_retrying",
      stripe_subscription_status: "past_due",
      last_invoice_id: "in_failed_123",
      last_invoice_status: "open",
    });
    expect(typeof billingUpserts[0].last_payment_failed_at).toBe("string");
  });

  it("marks billing as canceling when Stripe schedules cancellation at period end", async () => {
    constructEvent.mockReturnValue({
      id: "evt_subscription_updated_canceling",
      type: "customer.subscription.updated",
      livemode: false,
      data: {
        object: makeSubscription({
          cancel_at_period_end: true,
        }),
      },
    });

    const response = await POST(new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "t=1,v1=signature",
      },
      body: "subscription-updated-canceling",
    }));

    expect(response.status).toBe(200);
    expect(billingUpserts[0]).toMatchObject({
      user_id: "user_123",
      plan_tier: "premium",
      access_state: "premium_canceling",
      cancel_at_period_end: true,
    });
  });

  it("marks billing as canceling when Stripe schedules a future cancel_at date", async () => {
    constructEvent.mockReturnValue({
      id: "evt_subscription_updated_cancel_at",
      type: "customer.subscription.updated",
      livemode: false,
      data: {
        object: makeSubscription({
          cancel_at: 1_720_108_800,
          cancel_at_period_end: false,
          current_period_end: null,
          items: {
            data: [
              {
                current_period_start: 1_717_257_600,
                current_period_end: 1_720_108_800,
                price: {
                  id: "price_test_premium",
                },
              },
            ],
          },
        }),
      },
    });

    const response = await POST(new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "t=1,v1=signature",
      },
      body: "subscription-updated-cancel-at",
    }));

    expect(response.status).toBe(200);
    expect(billingUpserts[0]).toMatchObject({
      user_id: "user_123",
      plan_tier: "premium",
      access_state: "premium_canceling",
      cancel_at_period_end: true,
      current_period_end: "2024-07-04T16:00:00.000Z",
    });
  });

  it("marks billing as active again when a cancellation is resumed", async () => {
    constructEvent.mockReturnValue({
      id: "evt_subscription_updated_resumed",
      type: "customer.subscription.updated",
      livemode: false,
      data: {
        object: makeSubscription({
          cancel_at_period_end: false,
        }),
      },
    });

    const response = await POST(new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "t=1,v1=signature",
      },
      body: "subscription-updated-resumed",
    }));

    expect(response.status).toBe(200);
    expect(billingUpserts[0]).toMatchObject({
      user_id: "user_123",
      plan_tier: "premium",
      access_state: "premium_active",
      cancel_at_period_end: false,
    });
  });

  it("drops the account back to free after customer.subscription.deleted", async () => {
    constructEvent.mockReturnValue({
      id: "evt_subscription_deleted",
      type: "customer.subscription.deleted",
      livemode: false,
      data: {
        object: makeSubscription({ status: "canceled" }),
      },
    });

    const response = await POST(new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "t=1,v1=signature",
      },
      body: "subscription-deleted",
    }));

    expect(response.status).toBe(200);
    expect(billingUpserts[0]).toMatchObject({
      user_id: "user_123",
      plan_tier: "free",
      access_state: "free",
      stripe_subscription_status: "canceled",
      cancel_at_period_end: false,
    });
  });

  it("releases the idempotency claim if processing fails so Stripe can retry", async () => {
    constructEvent.mockReturnValue({
      id: "evt_processing_failure",
      type: "invoice.payment_succeeded",
      livemode: false,
      data: {
        object: {
          id: "in_paid_456",
          object: "invoice",
          subscription: "sub_123",
          customer: "cus_123",
          status: "paid",
          created: 1_717_300_000,
        },
      },
    });

    retrieveSubscription.mockResolvedValue(makeSubscription());
    billingUpsertError = { message: "db write failed" };

    const response = await POST(new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "t=1,v1=signature",
      },
      body: "processing-failure",
    }));

    expect(response.status).toBe(500);
    expect(releasedClaims).toEqual(["evt_processing_failure"]);
  });
});
