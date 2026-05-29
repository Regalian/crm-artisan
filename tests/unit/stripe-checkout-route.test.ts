// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, createCheckoutSession } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createCheckoutSession: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient,
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: createCheckoutSession,
      },
    },
  }),
}));

import { POST } from "@/app/api/stripe/checkout/route";

describe("POST /api/stripe/checkout", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      STRIPE_PREMIUM_PRICE_ID: "price_test_premium",
    };

    createCheckoutSession.mockReset();
    createClient.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("creates a subscription checkout session for free users and redirects to Stripe", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "user_123",
              email: "artisan@example.com",
            },
          },
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                plan_tier: "free",
                stripe_customer_id: null,
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    createCheckoutSession.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test_123",
    });

    const response = await POST(new Request("http://localhost:3000/api/stripe/checkout", { method: "POST" }));

    expect(createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
      mode: "subscription",
      line_items: [{ price: "price_test_premium", quantity: 1 }],
      customer_email: "artisan@example.com",
      client_reference_id: "user_123",
      success_url: "http://localhost:3000/dashboard?upgraded=true",
      cancel_url: "http://localhost:3000/dashboard",
      metadata: expect.objectContaining({
        source: "dashboard_upgrade_button",
        supabase_user_id: "user_123",
      }),
      subscription_data: expect.objectContaining({
        metadata: expect.objectContaining({
          source: "dashboard_upgrade_button",
          supabase_user_id: "user_123",
        }),
      }),
    }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://checkout.stripe.com/pay/cs_test_123");
  });

  it("uses the incoming request host for checkout return urls when accessed over a local LAN", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "user_123",
              email: "artisan@example.com",
            },
          },
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                plan_tier: "free",
                stripe_customer_id: null,
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    createCheckoutSession.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test_lan",
    });

    await POST(new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
      headers: {
        host: "192.168.0.116:3000",
        "x-forwarded-proto": "http",
      },
    }));

    expect(createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
      success_url: "http://192.168.0.116:3000/dashboard?upgraded=true",
      cancel_url: "http://192.168.0.116:3000/dashboard",
    }));
  });

  it("does not create a new checkout session for users who are already premium", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "user_123",
              email: "artisan@example.com",
            },
          },
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                plan_tier: "premium",
                stripe_customer_id: "cus_123",
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const response = await POST(new Request("http://localhost:3000/api/stripe/checkout", { method: "POST" }));

    expect(createCheckoutSession).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("redirects unauthenticated users to login", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: {
            user: null,
          },
        }),
      },
    });

    const response = await POST(new Request("http://localhost:3000/api/stripe/checkout", { method: "POST" }));

    expect(createCheckoutSession).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });
});
