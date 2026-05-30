// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, createPortalSession } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createPortalSession: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient,
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    billingPortal: {
      sessions: {
        create: createPortalSession,
      },
    },
  }),
}));

import { POST } from "@/app/api/stripe/portal/route";

describe("POST /api/stripe/portal", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      STRIPE_BILLING_PORTAL_CONFIGURATION_ID: "bpc_test_123",
    };

    createClient.mockReset();
    createPortalSession.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("creates a billing portal session for users with a Stripe customer", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "user_123",
            },
          },
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                stripe_customer_id: "cus_123",
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    createPortalSession.mockResolvedValue({
      url: "https://billing.stripe.com/p/session/test_123",
    });

    const response = await POST(new Request("http://localhost:3000/api/stripe/portal", { method: "POST" }));

    expect(createPortalSession).toHaveBeenCalledWith({
      customer: "cus_123",
      configuration: "bpc_test_123",
      return_url: "http://localhost:3000/billing",
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://billing.stripe.com/p/session/test_123");
  });

  it("uses the incoming request host for the portal return url on local LAN access", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "user_123",
            },
          },
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                stripe_customer_id: "cus_123",
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    createPortalSession.mockResolvedValue({
      url: "https://billing.stripe.com/p/session/test_lan",
    });

    await POST(new Request("http://localhost:3000/api/stripe/portal", {
      method: "POST",
      headers: {
        host: "192.168.0.116:3000",
        "x-forwarded-proto": "http",
      },
    }));

    expect(createPortalSession).toHaveBeenCalledWith(expect.objectContaining({
      return_url: "http://192.168.0.116:3000/billing",
    }));
  });

  it("redirects free users without a Stripe customer back to billing", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "user_123",
            },
          },
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                stripe_customer_id: null,
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const response = await POST(new Request("http://localhost:3000/api/stripe/portal", { method: "POST" }));

    expect(createPortalSession).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/billing?portalError=true");
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

    const response = await POST(new Request("http://localhost:3000/api/stripe/portal", { method: "POST" }));

    expect(createPortalSession).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });
});
